import assert from "node:assert/strict";
import test from "node:test";
import {
  aiDesignPreview,
  aiPreviewChanges,
  adjustAiProposal,
} from "../../src/features/organizer-resources/utils/ai-design-preview.ts";
import type {
  FloorLayout,
  ResourceOptions,
} from "../../src/features/organizer-resources/api/resources.ts";
import type { AiProposal } from "../../src/features/organizer-resources/api/floor-design.ts";

test("proposed resource types render rooms and preserve custom furniture icons before persistence", () => {
  const layout: FloorLayout = {
    floor: { id: 1, name: "Area", floorNumber: 1, status: "DRAFT", revision: "rev" },
    width: 1000,
    height: 800,
    editableLayout: true,
    resources: [],
    decorations: [],
  };
  const proposal: AiProposal = {
    proposalId: "draft",
    expiresAt: "",
    expectedRevision: "rev",
    scope: "WORKSPACE",
    applicable: true,
    issues: [],
    design: {
      message: "Room and locker",
      question: null,
      removeResourceIds: [],
      templates: [],
      newTypes: [
        {
          tempId: -1,
          name: "Team room",
          usageKind: "MEETING_ROOM",
          standardWidthM: 4,
          standardLengthM: 3,
          category: "ROOM",
          capacity: 4,
          currency: "USD",
          pricePerHour: null,
          pricePerDay: null,
          pricePerMonth: null,
        },
      ],
      resources: [
        {
          key: "n_room",
          id: null,
          resourceTypeId: -1,
          name: "Room",
          parentKey: null,
          capacity: null,
          posX: 100,
          posY: 100,
          width: 200,
          height: 200,
          rotation: 0,
        },
      ],
      decorations: [
        {
          id: "locker",
          kind: "OTHER",
          icon: "LOCKER",
          label: "Locker",
          color: "#64748B",
          posX: 500,
          posY: 100,
          width: 50,
          height: 50,
          rotation: 0,
        },
      ],
    },
  };
  const preview = aiDesignPreview(layout, proposal, {
    workspaceId: 1,
    workspaceStatus: "DRAFT",
    floors: [layout.floor],
    types: [],
  });
  assert.equal(preview.resources[0].category, "ROOM");
  assert.equal(preview.resources[0].capacity, 4);
  assert.equal(preview.decorations?.[0].icon, "LOCKER");
  assert.deepEqual(layout.resources, []);
});

test("AI preview preserves saved IDs, maps temporary room links and never mutates persisted state", () => {
  const layout: FloorLayout = {
    floor: { id: 7, name: "ODC", floorNumber: 1, status: "DRAFT", revision: "revision" },
    width: 1000,
    height: 800,
    editableLayout: true,
    resources: [
      {
        id: 1,
        code: "A1",
        name: "Existing desk",
        posX: 10,
        posY: 10,
        width: 30,
        height: 40,
        rotation: 0,
        status: "DRAFT",
        revision: "desk-rev",
        category: "DESK",
      },
    ],
    decorations: [],
  };
  const change = {
    key: "n_room",
    id: null,
    resourceTypeId: 2,
    name: "Room",
    parentKey: null,
    capacity: 4,
    posX: 100,
    posY: 100,
    width: 300,
    height: 300,
    rotation: 0,
  };
  const proposal: AiProposal = {
    proposalId: "draft",
    expiresAt: "",
    expectedRevision: "revision",
    scope: "WORKSPACE",
    applicable: true,
    issues: [],
    design: {
      message: "Preview",
      question: null,
      resources: [
        change,
        {
          ...change,
          key: "n_desk",
          resourceTypeId: 1,
          name: "Desk",
          parentKey: "n_room",
          capacity: 1,
          width: 30,
          height: 40,
          posX: 130,
          posY: 140,
        },
      ],
      removeResourceIds: [],
      decorations: [],
      templates: [],
    },
  };
  const options = {
    types: [
      { id: 1, category: "DESK" },
      { id: 2, category: "ROOM" },
    ],
  } as ResourceOptions;
  const before = JSON.stringify(layout);
  const preview = aiDesignPreview(layout, proposal, options);
  assert.equal(preview.resources[0].id, 1);
  assert.equal(preview.resources[2].parentRoomId, preview.resources[1].id);
  assert.equal(preview.resources[1].id < 0, true);
  assert.equal(JSON.stringify(layout), before);
  assert.deepEqual(aiPreviewChanges(layout, proposal), {
    "resource:-1": "ADD",
    "resource:-2": "ADD",
  });
});

test("editing and deleting in a preview retains untouched resources and identity", () => {
  const layout = {
    floor: { id: 7 },
    resources: [
      { id: 1, code: "A", revision: "x" },
      { id: 2, code: "B" },
    ],
    decorations: [],
  } as unknown as FloorLayout;
  const proposal = {
    design: {
      resources: [
        {
          key: "r_1",
          id: 1,
          resourceTypeId: 1,
          name: "Moved",
          posX: 50,
          posY: 60,
          width: 30,
          height: 40,
          rotation: 0,
          parentKey: null,
        },
      ],
      removeResourceIds: [2],
      decorations: [],
    },
  } as unknown as AiProposal;
  const result = aiDesignPreview(layout, proposal, {
    types: [{ id: 1, category: "DESK" }],
  } as ResourceOptions);
  assert.equal(result.resources.length, 1);
  assert.equal(result.resources[0].id, 1);
  assert.equal(result.resources[0].code, "A");
  assert.equal(result.resources[0].posX, 50);
});

test("manual room adjustments carry child desks and contained furnishings without saving IDs", () => {
  const layout = {
    floor: { id: 7 },
    width: 1000,
    height: 800,
    resources: [
      {
        id: 1,
        code: "R1",
        name: "Room",
        category: "ROOM",
        resourceTypeId: 2,
        capacity: 4,
        posX: 100,
        posY: 100,
        width: 300,
        height: 300,
        rotation: 0,
      },
      {
        id: 2,
        code: "D1",
        name: "Desk",
        category: "DESK",
        resourceTypeId: 1,
        capacity: 1,
        parentRoomId: 1,
        posX: 120,
        posY: 120,
        width: 30,
        height: 40,
        rotation: 0,
      },
    ],
    decorations: [
      {
        id: "plant",
        kind: "PLANT",
        label: "Plant",
        posX: 300,
        posY: 300,
        width: 30,
        height: 30,
        rotation: 0,
        color: "#00aa00",
      },
    ],
  } as FloorLayout;
  const proposal = {
    scope: "WORKSPACE",
    issues: [],
    applicable: true,
    design: {
      resources: [],
      removeResourceIds: [],
      decorations: layout.decorations,
      templates: [],
      question: null,
    },
  } as unknown as AiProposal;
  const options = {
    types: [
      { id: 1, category: "DESK" },
      { id: 2, category: "ROOM" },
    ],
  } as ResourceOptions;
  const adjusted = adjustAiProposal(layout, proposal, options, "resource:1", {
    x: 200,
    y: 200,
    width: 300,
    height: 300,
    rotation: 0,
  });
  assert.equal(adjusted.design.resources.find((item) => item.id === 2)?.posX, 220);
  assert.equal(adjusted.design.resources.find((item) => item.id === 2)?.parentKey, "r_1");
  assert.equal(adjusted.design.decorations[0].posX, 400);
  assert.equal(layout.resources[0].posX, 100);
  const configurationIssue =
    "The selected type has no confirmed configuration; propose a new type with dimensions and prices";
  const blocked = adjustAiProposal(
    layout,
    { ...proposal, applicable: false, issues: [configurationIssue] },
    options,
    "resource:1",
    { x: 200, y: 200, width: 300, height: 300, rotation: 0 },
  );
  assert.equal(blocked.applicable, false);
  assert.deepEqual(blocked.issues, [configurationIssue]);
});
