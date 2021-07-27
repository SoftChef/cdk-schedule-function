import * as fs from 'fs';
import * as path from 'path';
import { SynthUtils } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import { ScheduleFunction } from '../src/index';

const fnGetAttArn = (arn: string): { [key: string]: string[] } => {
  return {
    'Fn::GetAtt': [arn, 'Arn'],
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
  dispatchTargetFunctionTimeout: cdk.Duration.seconds(30),
  recentMinutes: cdk.Duration.minutes(30),
  lambdaFunctionRuntime: 'nodejs14.x',
  scheduleTableName: 'ScheduleFunctionScheduleTable60883DB8',
  testTargetFunctionName: 'TestTarget4042A7F7',
};

test('minimal usage', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'demo-stack');
  const testTargetFunction = new lambda.Function(stack, 'TestTarget', {
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'index.handler',
    code: new lambda.InlineCode(`
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
  expect(SynthUtils.synthesize(stack).template).toMatchSnapshot();
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Timeout: expected.dispatchTargetFunctionTimeout.toSeconds(),
  });
  expect(stack).toHaveResourceLike('AWS::Events::Rule', {
    ScheduleExpression: 'rate(1 minute)',
    State: 'ENABLED',
  });
  expect(stack).toCountResources('AWS::Lambda::Function', 7);
  expect(stack).toCountResources('AWS::Lambda::Permission', 1);
  expect(stack).toCountResources('AWS::IAM::Role', 7);
  expect(stack).toCountResources('AWS::IAM::Policy', 6); // Test target only has Role, non-policy
  expect(stack).toCountResources('AWS::DynamoDB::Table', 1);
  // Dispatch target function
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.dispatchTargetFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
          Resource: fnGetAttArn(expected.scheduleTableName),
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
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.createScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.updateScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.listScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.fetchScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
  expect(stack).toHaveResourceLike('AWS::Lambda::Function', {
    Runtime: expected.lambdaFunctionRuntime,
    Role: fnGetAttArn(expectedRoles.deleteScheduleFunctionRole),
    Environment: {
      Variables: {
        SCHEDULE_TABLE_NAME: ref(expected.scheduleTableName),
      },
    },
  });
  expect(stack).toHaveResourceLike('AWS::IAM::Policy', {
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
  expect(stack).toHaveResourceLike('AWS::DynamoDB::Table', {
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