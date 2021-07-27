import * as path from 'path';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as events from '@aws-cdk/aws-events';
import * as eventsTargets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as cdk from '@aws-cdk/core';

import { TargetFunctionProps } from './target-function';

const LAMBDA_ASSETS_PATH = path.resolve(__dirname, '../lambda-assets');
const DEFAULT_RECENT_MINUTES = 3; // minutes
const DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT = 10; // seconds

export interface ScheduleFunctionProps {
  /**
   * Specify the dispatch target function's timeout config
   * @default cdk.Duration.seconds(10)
   */
  readonly dispatchTargetFunctionTimeout?: cdk.Duration;
  /**
   * Enable / Disable event rule
   * @default true
   */
  readonly enabled?: boolean;
  /**
   * Set recent minutes, ex: cdk.Duration.minutes(5) will limit the schedule must grand 5 minutes than now
   * @default cdk.Duration.minutes(3)
   */
  readonly recentMinutes?: cdk.Duration;
}

export class ScheduleFunction extends cdk.Construct {
  /**
   * Specify all of target functions
   */
  private _targetFunctions: {
    [key: string]: TargetFunctionProps;
  } = {};
  /**
   * Set recent minutes, ex: cdk.Duration.minutes(5) will limit the schedule must grand 5 minutes than now
   */
  private _recentMinutes: cdk.Duration = cdk.Duration.minutes(DEFAULT_RECENT_MINUTES);
  /**
   * Set the dispatch function timeout
   */
  private _dispatchTargetFunctionTimeout: cdk.Duration = cdk.Duration.seconds(DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT);
  /**
   * Store all of schedules in DynamoDB table
   */
  public readonly scheduleTable: dynamodb.Table;
  /**
   * Set a event rule to invoke dispatch target function every minutes
   */
  public readonly dispatchTargetRule: events.Rule;
  /**
   * Put new schedule into table, you can trigger by API Gateway or other AWS service
   */
  public readonly createScheduleFunction: lambda.Function;
  /**
   * List all schedules from table, you can trigger by API Gateway or other AWS service
   */
  public readonly listSchedulesFunction: lambda.Function;
  /**
   * Fetch schedule from table, you can trigger by API Gateway or other AWS service
   */
  public readonly fetchScheduleFunction: lambda.Function;
  /**
   * Update schedule data, you can trigger by API Gateway or other AWS service
   */
  public readonly updateScheduleFunction: lambda.Function;
  /**
   * Delete schedule data, you can trigger by API Gateway or other AWS service
   */
  public readonly deleteScheduleFunction: lambda.Function;

  public constructor(scope: cdk.Construct, id: string, props?: ScheduleFunctionProps) {
    super(scope, id);
    this.recentMinutes = props?.recentMinutes ?? cdk.Duration.minutes(DEFAULT_RECENT_MINUTES);
    this.dispatchTagetFunctionTimeout = props?.dispatchTargetFunctionTimeout ?? cdk.Duration.seconds(DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT);
    this.scheduleTable = this._createScheduleTable();
    this.dispatchTargetRule = this._createDispatchTargetRule(props);
    this.createScheduleFunction = this._createCreateScheduleFunction();
    this.listSchedulesFunction = this._createListSchedulesFunction();
    this.fetchScheduleFunction = this._createFetchScheduleFunction();
    this.updateScheduleFunction = this._createUpdateScheduleFunction();
    this.deleteScheduleFunction = this._createDeleteScheduleFunction();
  }
  /**
   * Add a target function by targetType
   */
  public addTargetFunction(targetType: string, targetFunctionProps: TargetFunctionProps): this {
    this._targetFunctions[targetType] = targetFunctionProps;
    return this;
  }

  set recentMinutes(recentMinutes: cdk.Duration) {
    if (recentMinutes.toMinutes() < DEFAULT_RECENT_MINUTES) {
      throw new Error(`Recent minutes must grand than ${DEFAULT_RECENT_MINUTES}.`);
    }
    this._recentMinutes = recentMinutes;
  }

  set dispatchTagetFunctionTimeout(dispatchTargetFunctionTimeout: cdk.Duration) {
    if (dispatchTargetFunctionTimeout.toSeconds() < DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT) {
      throw new Error(`Dispatch target function timeout must grand than ${DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT}.`);
    }
    this._dispatchTargetFunctionTimeout = dispatchTargetFunctionTimeout;
  }
  /**
   * Transfer target function name to object
   */
  private _renderTargetFunctionsName(): { [key: string]: string } {
    const targetFunctionsName: {
      [key: string]: string;
    } = {};
    for (const targetType in this._targetFunctions) {
      targetFunctionsName[targetType] = this._targetFunctions[targetType].targetFunction.functionName;
    }
    return targetFunctionsName;
  }
  /**
   * Transfer target function ARN to object
   */
  private _renderTargetFunctionsArn(): { [key: string]: string } {
    const targetFunctionsArn: {
      [key: string]: string;
    } = {};
    for (const targetType in this._targetFunctions) {
      targetFunctionsArn[targetType] = this._targetFunctions[targetType].targetFunction.functionArn;
    }
    return targetFunctionsArn;
  }
  /**
   * EventBridge rule
   */
  private _createDispatchTargetRule(props?: ScheduleFunctionProps): events.Rule {
    return new events.Rule(this, 'DispatchTargetRule', {
      schedule: events.Schedule.rate(
        cdk.Duration.minutes(1),
      ),
      targets: [
        new eventsTargets.LambdaFunction(
          this._createDispatchTargetFunction(),
        ),
      ],
      enabled: props?.enabled ?? true,
    });
  }
  /**
   * Dispatch target function
   */
  private _createDispatchTargetFunction(): NodejsFunction {
    const dispatchTargetFunction = new NodejsFunction(this, 'DispatchTargetFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/dispatch-target/app.ts`,
      timeout: cdk.Duration.seconds(
        cdk.Lazy.uncachedNumber({
          produce: () => this._dispatchTargetFunctionTimeout.toSeconds(),
        }),
      ),
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
        TARGET_FUNCTIONS_NAME: cdk.Lazy.uncachedString({
          produce: () => JSON.stringify(
            this._renderTargetFunctionsName(),
          ),
        }),
      },
    });
    dispatchTargetFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'dispatch-schedule-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'dynamodb:Query',
              'dynamodb:UpdateItem',
            ],
            resources: [
              this.scheduleTable.tableArn,
            ],
          }),
          new iam.PolicyStatement({
            actions: [
              'lambda:InvokeFunction',
            ],
            resources: cdk.Lazy.uncachedList({
              produce: () => Object.values(
                this._renderTargetFunctionsArn(),
              ),
            }),
          }),
        ],
      }),
    );
    return dispatchTargetFunction;
  }
  /**
   * Schedule table
   */
  private _createScheduleTable(): dynamodb.Table {
    const table = new dynamodb.Table(this, 'ScheduleTable', {
      partitionKey: {
        name: 'scheduleId',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'Query-By-ScheduledAt',
      partitionKey: {
        name: 'scheduledAt',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'Query-By-TargetType',
      partitionKey: {
        name: 'targetType',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'Query-By-TargetId',
      partitionKey: {
        name: 'targetId',
        type: dynamodb.AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    return table;
  }
  /**
   * Create schedule function
   */
  private _createCreateScheduleFunction(): NodejsFunction {
    const createScheduleFunction = new NodejsFunction(this, 'CreateScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/create-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
        TARGET_FUNCTIONS_NAME: cdk.Lazy.uncachedString({
          produce: () => JSON.stringify(
            this._renderTargetFunctionsName(),
          ),
        }),
        RECENT_MINUTES: cdk.Lazy.uncachedString({
          produce: () => String(this._recentMinutes.toMinutes()),
        }),
      },
    });
    createScheduleFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'put-schedule-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'dynamodb:BatchWriteItem',
            ],
            resources: [
              this.scheduleTable.tableArn,
            ],
          }),
        ],
      }),
    );
    return createScheduleFunction;
  }
  /**
   * List schedules function
   */
  private _createListSchedulesFunction(): NodejsFunction {
    const listSchedulesFunction = new NodejsFunction(this, 'ListScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/list-schedules/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    listSchedulesFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'list-schedules-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'dynamodb:Query',
              'dynamodb:Scan',
            ],
            resources: [
              this.scheduleTable.tableArn,
            ],
          }),
        ],
      }),
    );
    return listSchedulesFunction;
  }
  /**
   * Fetch schedule function
   */
  private _createFetchScheduleFunction(): NodejsFunction {
    const fetchScheduleFunction = new NodejsFunction(this, 'FetchScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/fetch-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    fetchScheduleFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'fetch-schedule-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'dynamodb:GetItem',
            ],
            resources: [
              this.scheduleTable.tableArn,
            ],
          }),
        ],
      }),
    );
    return fetchScheduleFunction;
  }
  /**
   * Update schedule function
   */
  private _createUpdateScheduleFunction(): NodejsFunction {
    const updateScheduleFunction = new NodejsFunction(this, 'UpdateScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/update-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    updateScheduleFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'update-schedule-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'dynamodb:GetItem',
              'dynamodb:UpdateItem',
            ],
            resources: [
              this.scheduleTable.tableArn,
            ],
          }),
        ],
      }),
    );
    return updateScheduleFunction;
  }
  /**
   * Delete schedule function
   */
  private _createDeleteScheduleFunction(): NodejsFunction {
    const deleteScheduleFunction = new NodejsFunction(this, 'DeleteScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/delete-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    deleteScheduleFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'delete-schedule-policy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'dynamodb:GetItem',
              'dynamodb:DeleteItem',
            ],
            resources: [
              this.scheduleTable.tableArn,
            ],
          }),
        ],
      }),
    );
    return deleteScheduleFunction;
  }
}