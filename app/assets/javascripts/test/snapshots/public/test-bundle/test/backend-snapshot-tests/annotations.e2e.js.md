# Snapshot report for `public/test-bundle/test/backend-snapshot-tests/annotations.e2e.js`

The actual snapshot is saved in `annotations.e2e.js.snap`.

Generated by [AVA](https://ava.li).

## annotations-createExplorational

    {
      content: {
        id: 'id',
        typ: 'skeleton',
      },
      dataSetName: 'confocal-multi_knossos',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: '',
      formattedHash: 'formattedHash',
      id: 'id',
      isPublic: false,
      modified: 'modified',
      name: '',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: true,
        allowUpdate: true,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Active',
      stats: {},
      tags: [
        'confocal-multi_knossos',
        'skeleton',
      ],
      task: null,
      tracingTime: null,
      typ: 'Explorational',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: 'id',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: 'id',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: 'id',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: 'id',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }

## annotations-editAnnotation

    {
      content: {
        id: 'ae417175-f7bb-4a34-8187-d9c3b50143af',
        typ: 'skeleton',
      },
      dataSetName: '2012-06-28_Cortex',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: 'new description',
      formattedHash: '81c05d',
      id: '68135c192faeb34c0081c05d',
      isPublic: true,
      modified: 0,
      name: 'new name',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: true,
        allowUpdate: true,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Active',
      stats: {
        branchPointCount: 0,
        edgeCount: 28965,
        nodeCount: 28967,
        treeCount: 2,
      },
      tags: [
        '2012-06-28_Cortex',
        'skeleton',
      ],
      task: null,
      tracingTime: 0,
      typ: 'Explorational',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: '570b9f4d2a7c0e4d008da6ef',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: '570b9f4b2a7c0e3b008da6ec',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: '59882b370d889b84020efd3f',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: '59882b370d889b84020efd6f',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }

## annotations-finishAnnotation

    {
      content: {
        id: '76220a3a-9715-4792-bed8-6fda7ca8193f',
        typ: 'skeleton',
      },
      dataSetName: '2012-06-28_Cortex',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: '',
      formattedHash: '81c05d',
      id: '78135c192faeb34c0081c05d',
      isPublic: false,
      messages: [
        {
          success: 'Task is finished',
        },
      ],
      modified: 0,
      name: '',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: false,
        allowUpdate: false,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Finished',
      stats: {},
      tags: [
        '2012-06-28_Cortex',
        'skeleton',
      ],
      task: {
        boundingBox: null,
        created: 1477666728000,
        creationInfo: null,
        dataSet: '2012-06-28_Cortex',
        editPosition: [
          0,
          0,
          0,
        ],
        editRotation: [
          0,
          0,
          0,
        ],
        formattedHash: '8a5354',
        id: '681367a82faeb37a008a5354',
        neededExperience: {
          domain: 'abc',
          value: 0,
        },
        projectName: 'Test_Project3(for_annotation_mutations)',
        script: null,
        status: {
          active: 1,
          finished: -1,
          open: 10,
        },
        team: 'team_X2',
        tracingTime: 0,
        type: {
          description: 'Check those cells out!',
          id: '570b9f4c2a7c0e4c008da6ff',
          settings: {
            allowedModes: [
              'orthogonal',
              'oblique',
              'flight',
            ],
            branchPointsAllowed: true,
            somaClickingAllowed: true,
          },
          summary: 'ek_0674_BipolarCells',
          team: '69882b370d889b84020efd4f',
        },
      },
      tracingTime: null,
      typ: 'Task',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: '570b9f4d2a7c0e4d008da6ef',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: '570b9f4b2a7c0e3b008da6ec',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: '59882b370d889b84020efd3f',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: '59882b370d889b84020efd6f',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }

## annotations-finishAnnotation-explorational

    {
      content: {
        id: 'ae417175-f7bb-4a34-8187-d9c3b50143af',
        typ: 'skeleton',
      },
      dataSetName: '2012-06-28_Cortex',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: '',
      formattedHash: '81c05d',
      id: '68135c192faeb34c0081c05d',
      isPublic: false,
      messages: [
        {
          success: 'Annotation is archived',
        },
      ],
      modified: 0,
      name: '',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: false,
        allowUpdate: false,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Finished',
      stats: {
        branchPointCount: 0,
        edgeCount: 28965,
        nodeCount: 28967,
        treeCount: 2,
      },
      tags: [
        '2012-06-28_Cortex',
        'skeleton',
      ],
      task: null,
      tracingTime: null,
      typ: 'Explorational',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: '570b9f4d2a7c0e4d008da6ef',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: '570b9f4b2a7c0e3b008da6ec',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: '59882b370d889b84020efd3f',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: '59882b370d889b84020efd6f',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }

## annotations-getAnnotationInformation

    {
      content: {
        id: '4ab765c1-1089-4dc8-98c7-7cce4879f7e9',
        typ: 'skeleton',
      },
      dataSetName: '2012-06-28_Cortex',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: '',
      formattedHash: '56fe8f',
      id: '570b9ff12a7c0e980056fe8f',
      isPublic: false,
      modified: 0,
      name: '',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: true,
        allowUpdate: true,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Active',
      stats: {},
      tags: [
        '2012-06-28_Cortex',
        'skeleton',
      ],
      task: {
        boundingBox: null,
        created: 1477666728000,
        creationInfo: null,
        dataSet: '2012-06-28_Cortex',
        editPosition: [
          0,
          0,
          0,
        ],
        editRotation: [
          0,
          0,
          0,
        ],
        formattedHash: '8a5352',
        id: '581367a82faeb37a008a5352',
        neededExperience: {
          domain: 'abc',
          value: 0,
        },
        projectName: 'Test_Project',
        script: null,
        status: {
          active: 1,
          finished: -1,
          open: 10,
        },
        team: 'team_X1',
        tracingTime: null,
        type: {
          description: 'Check those cells out!',
          id: '570b9f4c2a7c0e4c008da6ee',
          settings: {
            allowedModes: [
              'orthogonal',
              'oblique',
              'flight',
            ],
            branchPointsAllowed: true,
            somaClickingAllowed: true,
          },
          summary: 'ek_0563_BipolarCells',
          team: '570b9f4b2a7c0e3b008da6ec',
        },
      },
      tracingTime: null,
      typ: 'TracingBase',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: '570b9f4d2a7c0e4d008da6ef',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: '570b9f4b2a7c0e3b008da6ec',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: '59882b370d889b84020efd3f',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: '59882b370d889b84020efd6f',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }

## annotations-reOpenAnnotation

    {
      content: {
        id: '76220a3a-9715-4792-bed8-6fda7ca8193f',
        typ: 'skeleton',
      },
      dataSetName: '2012-06-28_Cortex',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: '',
      formattedHash: '81c05d',
      id: '78135c192faeb34c0081c05d',
      isPublic: false,
      messages: [
        {
          success: 'Annotation was reopened',
        },
      ],
      modified: 0,
      name: '',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: true,
        allowUpdate: true,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Active',
      stats: {},
      tags: [
        '2012-06-28_Cortex',
        'skeleton',
      ],
      task: {
        boundingBox: null,
        created: 1477666728000,
        creationInfo: null,
        dataSet: '2012-06-28_Cortex',
        editPosition: [
          0,
          0,
          0,
        ],
        editRotation: [
          0,
          0,
          0,
        ],
        formattedHash: '8a5354',
        id: '681367a82faeb37a008a5354',
        neededExperience: {
          domain: 'abc',
          value: 0,
        },
        projectName: 'Test_Project3(for_annotation_mutations)',
        script: null,
        status: {
          active: 2,
          finished: -2,
          open: 10,
        },
        team: 'team_X2',
        tracingTime: 0,
        type: {
          description: 'Check those cells out!',
          id: '570b9f4c2a7c0e4c008da6ff',
          settings: {
            allowedModes: [
              'orthogonal',
              'oblique',
              'flight',
            ],
            branchPointsAllowed: true,
            somaClickingAllowed: true,
          },
          summary: 'ek_0674_BipolarCells',
          team: '69882b370d889b84020efd4f',
        },
      },
      tracingTime: 0,
      typ: 'Task',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: '570b9f4d2a7c0e4d008da6ef',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: '570b9f4b2a7c0e3b008da6ec',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: '59882b370d889b84020efd3f',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: '59882b370d889b84020efd6f',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }

## annotations-reOpenAnnotation-explorational

    {
      content: {
        id: 'ae417175-f7bb-4a34-8187-d9c3b50143af',
        typ: 'skeleton',
      },
      dataSetName: '2012-06-28_Cortex',
      dataStore: {
        name: 'localhost',
        typ: 'webknossos-store',
        url: 'http://localhost:9000',
      },
      description: '',
      formattedHash: '81c05d',
      id: '68135c192faeb34c0081c05d',
      isPublic: false,
      messages: [
        {
          success: 'Annotation was reopened',
        },
      ],
      modified: 0,
      name: '',
      restrictions: {
        allowAccess: true,
        allowDownload: true,
        allowFinish: true,
        allowUpdate: true,
      },
      settings: {
        allowedModes: [
          'orthogonal',
          'oblique',
          'flight',
        ],
        branchPointsAllowed: true,
        somaClickingAllowed: true,
      },
      state: 'Active',
      stats: {
        branchPointCount: 0,
        edgeCount: 28965,
        nodeCount: 28967,
        treeCount: 2,
      },
      tags: [
        '2012-06-28_Cortex',
        'skeleton',
      ],
      task: null,
      tracingTime: 0,
      typ: 'Explorational',
      user: {
        email: 'user_A@scalableminds.com',
        firstName: 'user_A',
        id: '570b9f4d2a7c0e4d008da6ef',
        isAnonymous: false,
        lastName: 'BoyA',
        teams: [
          {
            id: '570b9f4b2a7c0e3b008da6ec',
            isTeamManager: true,
            name: 'team_X1',
          },
          {
            id: '59882b370d889b84020efd3f',
            isTeamManager: false,
            name: 'team_X3',
          },
          {
            id: '59882b370d889b84020efd6f',
            isTeamManager: true,
            name: 'team_X4',
          },
        ],
      },
    }
