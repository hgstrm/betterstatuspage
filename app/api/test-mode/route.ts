/**
 * Test Mode API Route
 * Handles all test/staging mode operations
 * Stores test data separately from production
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { Component, Incident } from '@/lib/types';

const TEST_DATA_DIR = join(process.cwd(), '.test-data');
const TEST_DATA_FILE = join(TEST_DATA_DIR, 'test-data.json');

interface TestData {
  components: Component[];
  incidents: Incident[];
  templates: Array<{ id: string; name: string; body: string; [key: string]: unknown }>;
}

async function getTestData(): Promise<TestData> {
  try {
    if (!existsSync(TEST_DATA_FILE)) {
      return { components: [], incidents: [], templates: [] };
    }
    const data = await readFile(TEST_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { components: [], incidents: [], templates: [] };
  }
}

async function saveTestData(data: TestData): Promise<void> {
  try {
    if (!existsSync(TEST_DATA_DIR)) {
      await mkdir(TEST_DATA_DIR, { recursive: true });
    }
    await writeFile(TEST_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving test data:', error);
  }
}

async function validateAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('statuspage_session');
  const authHeader = request.headers.get('authorization');
  return sessionToken || authHeader?.startsWith('Bearer ');
}

function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function GET(request: NextRequest) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource'); // 'components', 'incidents', 'templates'
  const id = searchParams.get('id');
  const initialize = searchParams.get('initialize'); // 'true' to initialize with production data

  const testData = await getTestData();

  // Initialize test mode with production data if requested
  if (initialize === 'true' && resource === 'components') {
    const STATUSPAGE_API_KEY = process.env.STATUSPAGE_API_KEY;
    const STATUSPAGE_PAGE_ID = process.env.STATUSPAGE_PAGE_ID;
    const API_BASE_URL = 'https://api.statuspage.io/v1';

    if (STATUSPAGE_API_KEY && STATUSPAGE_PAGE_ID) {
      try {
        const response = await fetch(`${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/components`, {
          headers: {
            'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const productionComponents = await response.json();
          // Ensure we have an array and preserve all component properties
          const componentsArray = Array.isArray(productionComponents) ? productionComponents : [];
          // Make sure we have fresh test data before saving
          const currentTestData = await getTestData();
          currentTestData.components = componentsArray.map((comp: Component) => ({
            ...comp,
            // Ensure updated_at is set if missing
            updated_at: comp.updated_at || new Date().toISOString(),
          }));
          await saveTestData(currentTestData);
          // Return the initialized components
          return NextResponse.json(currentTestData.components);
        }
      } catch (error) {
        console.error('Error initializing test components:', error);
      }
    }
  }

  if (id) {
    // Get single resource
    const items = testData[resource as keyof TestData] || [];
    const foundItem = items.find((item) => item.id === id);
    if (!foundItem) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Normalize components for incidents
    if (resource === 'incidents' && 'components' in foundItem) {
      const normalizedItem = {
        ...foundItem,
        components: Array.isArray(foundItem.components) ? foundItem.components : [],
      };
      return NextResponse.json(normalizedItem);
    }
    return NextResponse.json(foundItem);
  }

  // Get all resources
  if (resource === 'components') {
    // If components are empty and not initializing, try to initialize automatically
    if (testData.components.length === 0 && initialize !== 'true') {
      const STATUSPAGE_API_KEY = process.env.STATUSPAGE_API_KEY;
      const STATUSPAGE_PAGE_ID = process.env.STATUSPAGE_PAGE_ID;
      const API_BASE_URL = 'https://api.statuspage.io/v1';

      if (STATUSPAGE_API_KEY && STATUSPAGE_PAGE_ID) {
        try {
          const response = await fetch(`${API_BASE_URL}/pages/${STATUSPAGE_PAGE_ID}/components`, {
            headers: {
              'Authorization': `OAuth ${STATUSPAGE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const productionComponents = await response.json();
            const componentsArray = Array.isArray(productionComponents) ? productionComponents : [];
            testData.components = componentsArray.map((comp: Component) => ({
              ...comp,
              updated_at: comp.updated_at || new Date().toISOString(),
            }));
            await saveTestData(testData);
          }
        } catch (error) {
          console.error('Error auto-initializing test components:', error);
        }
      }
    }

    // Sync component statuses from open incidents
    // If an incident has a component with a non-operational status, update that component
    const openIncidents = testData.incidents.filter((inc: Incident) => 
      inc.status !== 'resolved' && inc.status !== 'postmortem'
    );
    
    // First, reset all components to operational if they're not affected by any open incident
    const componentIdsAffectedByOpenIncidents = new Set<string>();
    
    // Collect all component IDs that are affected by open incidents
    openIncidents.forEach((incident: Incident) => {
      if (incident.components && Array.isArray(incident.components)) {
        incident.components.forEach((incidentComponent: Component) => {
          if (incidentComponent.status && incidentComponent.status !== 'operational') {
            componentIdsAffectedByOpenIncidents.add(incidentComponent.id);
          }
        });
      }
    });
    
    // Reset components that are not affected by any open incident to operational
    let componentsReset = false;
    testData.components.forEach((component: Component, index: number) => {
      if (!componentIdsAffectedByOpenIncidents.has(component.id) && component.status !== 'operational') {
        testData.components[index] = {
          ...component,
          status: 'operational',
          updated_at: new Date().toISOString(),
        };
        componentsReset = true;
      }
    });
    
    // Now update components based on open incidents
    let componentsUpdated = false;
    openIncidents.forEach((incident: Incident) => {
      if (incident.components && Array.isArray(incident.components)) {
        incident.components.forEach((incidentComponent: Component) => {
          if (incidentComponent.status && incidentComponent.status !== 'operational') {
            const componentIndex = testData.components.findIndex((c: Component) => c.id === incidentComponent.id);
            if (componentIndex !== -1) {
              const currentStatus = testData.components[componentIndex].status;
              if (currentStatus !== incidentComponent.status) {
                testData.components[componentIndex] = {
                  ...testData.components[componentIndex],
                  status: incidentComponent.status,
                  updated_at: new Date().toISOString(),
                };
                componentsUpdated = true;
              }
            }
          }
        });
      }
    });

    if (componentsUpdated || componentsReset) {
      await saveTestData(testData);
    }

    return NextResponse.json(testData.components);
  } else if (resource === 'incidents') {
    const limit = parseInt(searchParams.get('limit') || '50');
    const incidents = testData.incidents.slice(0, limit);
    // Ensure components is always an array
    const normalizedIncidents = incidents.map((incident: Incident) => ({
      ...incident,
      components: Array.isArray(incident.components) ? incident.components : [],
    }));
    return NextResponse.json(normalizedIncidents);
  } else if (resource === 'templates') {
    return NextResponse.json(testData.templates);
  }

  return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const body = await request.json();

  const testData = await getTestData();

  if (resource === 'components') {
    const newComponent = {
      id: generateTestId(),
      name: body.name || 'Test Component',
      status: body.status || 'operational',
      ...body,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    testData.components.push(newComponent);
    await saveTestData(testData);
    return NextResponse.json(newComponent);
  } else if (resource === 'incidents') {
    // Convert components Record to array format for storage
    let componentsArray: Component[] = [];
    if (body.components && typeof body.components === 'object' && !Array.isArray(body.components)) {
      // body.components is a Record like { componentId: status }
      // Convert it to array format by fetching component details
      const testDataSnapshot = await getTestData();
      componentsArray = Object.entries(body.components).map(([componentId, status]) => {
        const component = testDataSnapshot.components.find((c: Component) => c.id === componentId);
        return component ? {
          ...component,
          status: status as Component['status'],
        } : {
          id: componentId,
          name: `Component ${componentId}`,
          status: status as Component['status'],
        } as Component;
      });

      // Update component statuses in the components array
      Object.entries(body.components).forEach(([componentId, status]) => {
        const componentIndex = testDataSnapshot.components.findIndex((c: Component) => c.id === componentId);
        if (componentIndex !== -1) {
          testDataSnapshot.components[componentIndex] = {
            ...testDataSnapshot.components[componentIndex],
            status: status as Component['status'],
            updated_at: new Date().toISOString(),
          };
        }
      });
      // Save updated components
      await saveTestData(testDataSnapshot);
    } else if (Array.isArray(body.components)) {
      componentsArray = body.components;
    }

    const newIncident = {
      id: generateTestId(),
      name: body.name,
      status: body.status,
      impact: body.impact || 'minor',
      body: body.body,
      components: componentsArray,
      component_ids: body.component_ids || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      incident_updates: [{
        id: generateTestId(),
        status: body.status,
        body: body.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_at: new Date().toISOString(),
      }],
    };
    testData.incidents.unshift(newIncident);
    await saveTestData(testData);
    return NextResponse.json(newIncident);
  } else if (resource === 'templates') {
    const newTemplate = {
      id: generateTestId(),
      name: body.name,
      body: body.body,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    testData.templates.push(newTemplate);
    await saveTestData(testData);
    return NextResponse.json(newTemplate);
  }

  return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const id = searchParams.get('id');
  const body = await request.json();

  const testData = await getTestData();

  // Handle component updates (componentId passed in body)
  if (resource === 'components' && body.componentId) {
    const componentId = body.componentId;
    const componentIndex = testData.components.findIndex((c: Component) => c.id === componentId);
    if (componentIndex === -1) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }
    // Update the component while preserving all other properties
    testData.components[componentIndex] = {
      ...testData.components[componentIndex],
      status: body.status,
      updated_at: new Date().toISOString(),
    };
    await saveTestData(testData);
    return NextResponse.json(testData.components[componentIndex]);
  }

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const items = testData[resource as keyof TestData] as (Component | Incident | TestData['templates'][number])[] || [];
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Handle incident updates specially
  if (resource === 'incidents') {
    const incident = items[index] as Incident;
    if (body.incident_update) {
      // Adding an update to an incident
      if (!incident.incident_updates) {
        incident.incident_updates = [];
      }
      incident.incident_updates.push({
        id: generateTestId(),
        status: body.incident_update.status || incident.status,
        body: body.incident_update.body || body.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_at: body.incident_update.display_at || new Date().toISOString(),
      });
      incident.status = body.status || incident.status;
      incident.updated_at = new Date().toISOString();
    } else {
      // Regular update - handle components conversion if needed
      let componentsArray = incident.components || [];
      if (body.components && typeof body.components === 'object' && !Array.isArray(body.components)) {
        // Convert components Record to array
        const testDataSnapshot = await getTestData();
        componentsArray = Object.entries(body.components).map(([componentId, status]) => {
          const component = testDataSnapshot.components.find((c: Component) => c.id === componentId);
          return component ? {
            ...component,
            status: status as Component['status'],
          } : {
            id: componentId,
            name: `Component ${componentId}`,
            status: status as Component['status'],
          } as Component;
        });

        // Update component statuses in the components array
        Object.entries(body.components).forEach(([componentId, status]) => {
          const componentIndex = testDataSnapshot.components.findIndex((c: Component) => c.id === componentId);
          if (componentIndex !== -1) {
            testDataSnapshot.components[componentIndex] = {
              ...testDataSnapshot.components[componentIndex],
              status: status as Component['status'],
              updated_at: new Date().toISOString(),
            };
          }
        });
        // Save updated components
        await saveTestData(testDataSnapshot);
      } else if (Array.isArray(body.components)) {
        componentsArray = body.components;
      }

      items[index] = {
        ...items[index],
        ...body,
        components: componentsArray.length > 0 ? componentsArray : incident.components,
        updated_at: new Date().toISOString(),
      };
    }
  } else {
    items[index] = {
      ...items[index],
      ...body,
      updated_at: new Date().toISOString(),
    };
  }

  await saveTestData(testData);
  return NextResponse.json(items[index]);
}

export async function DELETE(request: NextRequest) {
  if (!await validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  const testData = await getTestData();
  const items = testData[resource as keyof TestData] as (Component | Incident | TestData['templates'][number])[] || [];
  const filtered = items.filter((item) => item.id !== id);

  if (filtered.length === items.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (resource === 'components') {
    testData.components = filtered as Component[];
  } else if (resource === 'incidents') {
    testData.incidents = filtered as Incident[];
  } else if (resource === 'templates') {
    testData.templates = filtered as TestData['templates'];
  }
  await saveTestData(testData);
  return NextResponse.json({ success: true });
}

