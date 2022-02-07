import {
  Template,
} from 'aws-cdk-lib/assertions';
import {
  Function,
  InlineCode,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import {
  App,
  Duration,
  Stack,
} from 'aws-cdk-lib/core';
import {
  ScheduleFunction,
} from '../src/index';

const fnGetAttArn = (arn: string): { [key: string]: string[] } => {
  return {
    'Fn::GetAtt': [arn, 'Arn'],
  };
};
const fnJoin = (delimiter: string, values: any[]): { [key: string]: any[] } => {
  return {
    'Fn::Join': [delimiter, values],
  };
};
const ref = (name: string): { [key: string]: string } => {
  return {
    Ref: name,
  };
};

const expectedRoles = {
  dispatchTargetFunctionRole: 'ScheduleFunctionDispatchTargetFunctionServiceRole89FC967C',
  createScheduleFunctionRole: 'ScheduleFunctionCreateScheduleFunctionServiceRole5CB97B76',
  updateScheduleFunctionRole: 'ScheduleFunctionUpdateScheduleFunctionServiceRoleCAC6BD24',
  listScheduleFunctionRole: 'ScheduleFunctionListScheduleFunctionServiceRole5EA5341C',
  fetchScheduleFunctionRole: 'ScheduleFunctionFetchScheduleFunctionServiceRole0891609B',
  deleteScheduleFunctionRole: 'ScheduleFunctionDeleteScheduleFunctionServiceRoleE5D76AB9',
};

const expected = {
  dispatchTargetFunctionTimeout: Duration.seconds(30),
  recentMinutes: Duration.minutes(30),
  lambdaFunctionRuntime: 'nodejs14.x',
  scheduleTableName: 'ScheduleFunctionScheduleTable60883DB8',
  scheduleTableQueryByScheduledAtIndexName: 'ScheduleFunctionScheduleTable60883DB8/index/Query-By-ScheduledAt',
  testTargetFunctionName: 'TestTarget4042A7F7',
};

test('minimal usage', () => {
  const app = new App();
  const stack = new Stack(app, 'demo-stack');
  const testTargetFunction = new Function(stack, 'TestTarget', {
    runtime: Runtime.NODEJS_12_X,
    handler: 'index.handler',
    code: new InlineCode(`
      export async function handler() {
        return {
          success: true,
          result: event.context,
        };
      }
    `),
  });
  const scheduleFunction = new ScheduleFunction(stack, 'ScheduleFunction', {
    dispatchTargetFunctionTimeout: expected.dispatchTargetFunctionTimeout,
    recentMinutes: expected.recentMinutes,
  });
  scheduleFunction.addTargetFunction('TestTarget', {
    targetFunction: testTargetFunction,
  });
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Timeout: expected.dispatchTargetFunctionTimeout.toSeconds(),
  });
  template.hasResourceProperties('AWS::Events::Rule', {
    ScheduleExpression: 'rate(1 minute)',
    State: 'ENABLED',
  });
  template.resourceCountIs('AWS::Lambda::Function', 7);
  template.resourceCountIs('AWS::Lambda::Permission', 1);
  template.resourceCountIs('AWS::IAM::Role', 7);
  template.resourceCountIs('AWS::IAM::Policy', 6); // Test target only has Role, non-policy
  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  // Dispatch target function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.dispatchTargetFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      ref(expectedRoles.dispatchTargetFunctionRole),
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'dynamodb:Query',
            'dynamodb:UpdateItem',
          ],
          Effect: 'Allow',
          Resource: [
            fnGetAttArn(expected.scheduleTableName),
            fnJoin('', [
              fnGetAttArn(expected.scheduleTableName),
              '/index/Query-By-ScheduledAt',
            ]),
          ],
        },
        {
          Action: 'lambda:InvokeFunction',
          Effect: 'Allow',
          Resource: [
            fnGetAttArn(expected.testTargetFunctionName),
          ],
        },
      ],
    },
  });
  // Create schedule function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.createScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      ref(expectedRoles.createScheduleFunctionRole),
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: 'dynamodb:BatchWriteItem',
          Effect: 'Allow',
          Resource: fnGetAttArn(expected.scheduleTableName),
        },
      ],
    },
  });
  // Update schedule function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.updateScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      ref(expectedRoles.updateScheduleFunctionRole),
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'dynamodb:GetItem',
            'dynamodb:UpdateItem',
          ],
          Effect: 'Allow',
          Resource: fnGetAttArn(expected.scheduleTableName),
        },
      ],
    },
  });
  // List schedules function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.listScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      ref(expectedRoles.listScheduleFunctionRole),
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'dynamodb:Query',
            'dynamodb:Scan',
          ],
          Effect: 'Allow',
          Resource: fnGetAttArn(expected.scheduleTableName),
        },
      ],
    },
  });
  // Fetch schedule function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.fetchScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      ref(expectedRoles.fetchScheduleFunctionRole),
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: 'dynamodb:GetItem',
          Effect: 'Allow',
          Resource: fnGetAttArn(expected.scheduleTableName),
        },
      ],
    },
  });
  // Delete schedule function
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.deleteScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      ref(expectedRoles.deleteScheduleFunctionRole),
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'dynamodb:GetItem',
            'dynamodb:DeleteItem',
          ],
          Effect: 'Allow',
          Resource: fnGetAttArn(expected.scheduleTableName),
        },
      ],
    },
  });
  // Schedule Table
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    AttributeDefinitions: [
      {
        AttributeName: 'scheduleId',
        AttributeType: 'S',
      },
      {
        AttributeName: 'scheduledAt',
        AttributeType: 'S',
      },
      {
        AttributeName: 'targetType',
        AttributeType: 'S',
      },
      {
        AttributeName: 'targetId',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'scheduleId',
        KeyType: 'HASH',
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: 'Query-By-ScheduledAt',
        KeySchema: [
          {
            AttributeName: 'scheduledAt',
            KeyType: 'HASH',
          },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
      {
        IndexName: 'Query-By-TargetType',
        KeySchema: [
          {
            AttributeName: 'targetType',
            KeyType: 'HASH',
          },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
      {
        IndexName: 'Query-By-TargetId',
        KeySchema: [
          {
            AttributeName: 'targetId',
            KeyType: 'HASH',
          },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
    ],
  });
});