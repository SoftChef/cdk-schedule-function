import * as path from 'path';
import {
  AttributeType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import {
  Rule, Schedule,
} from 'aws-cdk-lib/aws-events';
import {
  LambdaFunction as EventTargateLambdaFunction,
} from 'aws-cdk-lib/aws-events-targets';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  Function,
} from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  Duration,
  Lazy,
} from 'aws-cdk-lib/core';
import {
  Construct,
} from 'constructs';
import { TargetFunctionProps } from './target-function';

const LAMBDA_ASSETS_PATH = path.resolve(__dirname, '../lambda-assets');
const DEFAULT_RECENT_MINUTES = 3; // minutes
const DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT = 10; // seconds

export interface ScheduleFunctionProps {
  /**
   * Specify the dispatch target function's timeout config
   * @default Duration.seconds(10)
   */
  readonly dispatchTargetFunctionTimeout?: Duration;
  /**
   * Enable / Disable event rule
   * @default true
   */
  readonly enabled?: boolean;
  /**
   * Set recent minutes, ex: Duration.minutes(5) will limit the schedule must grand 5 minutes than now
   * @default Duration.minutes(3)
   */
  readonly recentMinutes?: Duration;
}

export class ScheduleFunction extends Construct {
  /**
   * Specify all of target functions
   */
  private targetFunctions: {
    [key: string]: TargetFunctionProps;
  } = {};
  /**
   * Set recent minutes, ex: Duration.minutes(5) will limit the schedule must grand 5 minutes than now
   */
  private _recentMinutes: Duration = Duration.minutes(DEFAULT_RECENT_MINUTES);
  /**
   * Set the dispatch function timeout
   */
  private _dispatchTargetFunctionTimeout: Duration = Duration.seconds(DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT);
  /**
   * Store all of schedules in DynamoDB table
   */
  public readonly scheduleTable: Table;
  /**
   * Set a event rule to invoke dispatch target function every minutes
   */
  public readonly dispatchTargetRule: Rule;
  /**
   * Put new schedule into table, you can trigger by API Gateway or other AWS service
   */
  public readonly createScheduleFunction: Function;
  /**
   * List all schedules from table, you can trigger by API Gateway or other AWS service
   */
  public readonly listSchedulesFunction: Function;
  /**
   * Fetch schedule from table, you can trigger by API Gateway or other AWS service
   */
  public readonly fetchScheduleFunction: Function;
  /**
   * Update schedule data, you can trigger by API Gateway or other AWS service
   */
  public readonly updateScheduleFunction: Function;
  /**
   * Delete schedule data, you can trigger by API Gateway or other AWS service
   */
  public readonly deleteScheduleFunction: Function;

  public constructor(scope: Construct, id: string, props?: ScheduleFunctionProps) {
    super(scope, id);
    this.recentMinutes = props?.recentMinutes ?? Duration.minutes(DEFAULT_RECENT_MINUTES);
    this.dispatchTargetFunctionTimeout = props?.dispatchTargetFunctionTimeout ?? Duration.seconds(DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT);
    this.scheduleTable = this.createScheduleTable();
    this.dispatchTargetRule = this.createDispatchTargetRule(props);
    this.createScheduleFunction = this.createCreateScheduleFunction();
    this.listSchedulesFunction = this.createListSchedulesFunction();
    this.fetchScheduleFunction = this.createFetchScheduleFunction();
    this.updateScheduleFunction = this.createUpdateScheduleFunction();
    this.deleteScheduleFunction = this.createDeleteScheduleFunction();
  }
  /**
   * Add a target function by targetType
   */
  public addTargetFunction(targetType: string, targetFunctionProps: TargetFunctionProps): this {
    this.targetFunctions[targetType] = targetFunctionProps;
    return this;
  }

  public set recentMinutes(recentMinutes: Duration) {
    if (recentMinutes.toMinutes() < DEFAULT_RECENT_MINUTES) {
      throw new Error(`Recent minutes must grand than ${DEFAULT_RECENT_MINUTES}.`);
    }
    this._recentMinutes = recentMinutes;
  }

  public get recentMinutes(): Duration {
    return this._recentMinutes;
  }

  public set dispatchTargetFunctionTimeout(dispatchTargetFunctionTimeout: Duration) {
    if (dispatchTargetFunctionTimeout.toSeconds() < DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT) {
      throw new Error(`Dispatch target function timeout must grand than ${DEFAULT_DISPATCH_TARGET_FUNCTION_TIMEOUT}.`);
    }
    this._dispatchTargetFunctionTimeout = dispatchTargetFunctionTimeout;
  }

  public get dispatchTargetFunctionTimeout(): Duration {
    return this._dispatchTargetFunctionTimeout;
  }
  /**
   * Transfer target function name to object
   */
  private renderTargetFunctionsName(): { [key: string]: string } {
    const targetFunctionsName: {
      [key: string]: string;
    } = {};
    for (const targetType in this.targetFunctions) {
      targetFunctionsName[targetType] = this.targetFunctions[targetType].targetFunction.functionName;
    }
    return targetFunctionsName;
  }
  /**
   * Transfer target function ARN to object
   */
  private renderTargetFunctionsArn(): { [key: string]: string } {
    const targetFunctionsArn: {
      [key: string]: string;
    } = {};
    for (const targetType in this.targetFunctions) {
      targetFunctionsArn[targetType] = this.targetFunctions[targetType].targetFunction.functionArn;
    }
    return targetFunctionsArn;
  }
  /**
   * EventBridge rule
   */
  private createDispatchTargetRule(props?: ScheduleFunctionProps): Rule {
    return new Rule(this, 'DispatchTargetRule', {
      schedule: Schedule.rate(
        Duration.minutes(1),
      ),
      targets: [
        new EventTargateLambdaFunction(
          this.createDispatchTargetFunction(),
        ),
      ],
      enabled: props?.enabled ?? true,
    });
  }
  /**
   * Dispatch target function
   */
  private createDispatchTargetFunction(): NodejsFunction {
    const dispatchTargetFunction = new NodejsFunction(this, 'DispatchTargetFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/dispatch-target/app.ts`,
      timeout: Duration.seconds(
        Lazy.uncachedNumber({
          produce: () => this.dispatchTargetFunctionTimeout.toSeconds(),
        }),
      ),
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
        TARGET_FUNCTIONS_NAME: Lazy.uncachedString({
          produce: () => JSON.stringify(
            this.renderTargetFunctionsName(),
          ),
        }),
      },
    });
    dispatchTargetFunction.role?.attachInlinePolicy(
      new Policy(this, 'dispatch-schedule-policy', {
        statements: [
          new PolicyStatement({
            actions: [
              'dynamodb:Query',
              'dynamodb:UpdateItem',
            ],
            resources: [
              this.scheduleTable.tableArn,
              `${this.scheduleTable.tableArn}/index/Query-By-ScheduledAt`,
            ],
          }),
          new PolicyStatement({
            actions: [
              'lambda:InvokeFunction',
            ],
            resources: Lazy.uncachedList({
              produce: () => Object.values(
                this.renderTargetFunctionsArn(),
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
  private createScheduleTable(): Table {
    const table = new Table(this, 'ScheduleTable', {
      partitionKey: {
        name: 'scheduleId',
        type: AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'Query-By-ScheduledAt',
      partitionKey: {
        name: 'scheduledAt',
        type: AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'Query-By-TargetType',
      partitionKey: {
        name: 'targetType',
        type: AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'Query-By-TargetId',
      partitionKey: {
        name: 'targetId',
        type: AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
    });
    return table;
  }
  /**
   * Create schedule function
   */
  private createCreateScheduleFunction(): NodejsFunction {
    const createScheduleFunction = new NodejsFunction(this, 'CreateScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/create-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
        TARGET_FUNCTIONS_NAME: Lazy.uncachedString({
          produce: () => JSON.stringify(
            this.renderTargetFunctionsName(),
          ),
        }),
        RECENT_MINUTES: Lazy.uncachedString({
          produce: () => String(this.recentMinutes.toMinutes()),
        }),
      },
    });
    createScheduleFunction.role?.attachInlinePolicy(
      new Policy(this, 'put-schedule-policy', {
        statements: [
          new PolicyStatement({
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
  private createListSchedulesFunction(): NodejsFunction {
    const listSchedulesFunction = new NodejsFunction(this, 'ListScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/list-schedules/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    listSchedulesFunction.role?.attachInlinePolicy(
      new Policy(this, 'list-schedules-policy', {
        statements: [
          new PolicyStatement({
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
  private createFetchScheduleFunction(): NodejsFunction {
    const fetchScheduleFunction = new NodejsFunction(this, 'FetchScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/fetch-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    fetchScheduleFunction.role?.attachInlinePolicy(
      new Policy(this, 'fetch-schedule-policy', {
        statements: [
          new PolicyStatement({
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
  private createUpdateScheduleFunction(): NodejsFunction {
    const updateScheduleFunction = new NodejsFunction(this, 'UpdateScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/update-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    updateScheduleFunction.role?.attachInlinePolicy(
      new Policy(this, 'update-schedule-policy', {
        statements: [
          new PolicyStatement({
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
  private createDeleteScheduleFunction(): NodejsFunction {
    const deleteScheduleFunction = new NodejsFunction(this, 'DeleteScheduleFunction', {
      entry: `${LAMBDA_ASSETS_PATH}/delete-schedule/app.ts`,
      environment: {
        SCHEDULE_TABLE_NAME: this.scheduleTable.tableName,
      },
    });
    deleteScheduleFunction.role?.attachInlinePolicy(
      new Policy(this, 'delete-schedule-policy', {
        statements: [
          new PolicyStatement({
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