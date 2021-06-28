import * as path from 'path';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as events from '@aws-cdk/aws-events';
import * as eventsTargets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as cdk from '@aws-cdk/core';

const LAMBDA_ASSETS_PATH = path.resolve(__dirname, '../lambda-assets');
const DEFAULT_RECENT_MINUTES = 3; // minutes
const DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT = 10; // seconds

export interface ScheduleFunctionProps {
  /**
   * Specify the dispatch target function's timeout config
   */
  readonly dispatchTargetFunctionTimeout?: cdk.Duration;
  /**
   * Enable / Disable event rule
   */
  readonly enabled?: boolean;
  /**
   * Set recent minutes, ex: cdk.Duration.minutes(5) will limit the schedule must grand 5 minutes than now
   */
  readonly recentMinutes?: cdk.Duration;
}

export interface TargetFunctionProps {
  readonly targetFunction: lambda.Function;
}

export class ScheduleFunction extends cdk.Construct {

  private _targetFunctions: {
    [key: string]: TargetFunctionProps;
  } = {};

  private _recentMinutes: cdk.Duration = cdk.Duration.minutes(DEFAULT_RECENT_MINUTES);

  private _dispatchTargetFunctionTimeout: cdk.Duration = cdk.Duration.seconds(DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT);

  public readonly scheduleTable: dynamodb.Table;

  public readonly dispatchTargetRule: events.Rule;

  public readonly createScheduleFunction: lambda.Function;

  public readonly listSchedulesFunction: lambda.Function;

  public readonly fetchScheduleFunction: lambda.Function;

  public readonly updateScheduleFunction: lambda.Function;

  public readonly deleteScheduleFunction: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props?: ScheduleFunctionProps) {
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

  private _renderTargetFunctionsName(): { [key: string]: string } {
    const targetFunctionsName: {
      [key: string]: string;
    } = {};
    for (const targetType in this._targetFunctions) {
      targetFunctionsName[targetType] = this._targetFunctions[targetType].targetFunction.functionName;
    }
    return targetFunctionsName;
  }

  private _renderTargetFunctionsArn(): { [key: string]: string } {
    const targetFunctionsArn: {
      [key: string]: string;
    } = {};
    for (const targetType in this._targetFunctions) {
      targetFunctionsArn[targetType] = this._targetFunctions[targetType].targetFunction.functionArn;
    }
    return targetFunctionsArn;
  }

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
      new iam.Policy(this, 'update-schedule-policy', {
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

  private _createScheduleTable(): dynamodb.Table {
    const table = new dynamodb.Table(this, 'ScheduleTable', {
      partitionKey: {
        name: 'scheduledAt',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
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
    });
    return table;
  }

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

  private _createListSchedulesFunction(): NodejsFunction {
    const listSchedulesFunction = new NodejsFunction(this, 'ListScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/list-schedules/app.ts`,
    });
    listSchedulesFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'list-schedules-policy', {
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
        ],
      }),
    );
    return listSchedulesFunction;
  }

  private _createFetchScheduleFunction(): NodejsFunction {
    const fetchScheduleFunction = new NodejsFunction(this, 'FetchScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/create-schedule/app.ts`,
    });
    return fetchScheduleFunction;
  }

  private _createUpdateScheduleFunction(): NodejsFunction {
    const updateScheduleFunction = new NodejsFunction(this, 'UpdateScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/create-schedule/app.ts`,
    });
    return updateScheduleFunction;
  }

  private _createDeleteScheduleFunction(): NodejsFunction {
    const deleteScheduleFunction = new NodejsFunction(this, 'DeleteScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/create-schedule/app.ts`,
    });
    return deleteScheduleFunction;
  }
}