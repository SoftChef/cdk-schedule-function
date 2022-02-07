# API Reference

**Classes**

Name|Description
----|-----------
[ScheduleFunction](#softchef-cdk-schedule-function-schedulefunction)|*No description*


**Structs**

Name|Description
----|-----------
[ScheduleFunctionProps](#softchef-cdk-schedule-function-schedulefunctionprops)|*No description*
[TargetFunctionProps](#softchef-cdk-schedule-function-targetfunctionprops)|*No description*



## class ScheduleFunction  <a id="softchef-cdk-schedule-function-schedulefunction"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IDependable](#constructs-idependable)
__Extends__: [Construct](#constructs-construct)

### Initializer




```ts
new ScheduleFunction(scope: Construct, id: string, props?: ScheduleFunctionProps)
```

* **scope** (<code>[Construct](#constructs-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[ScheduleFunctionProps](#softchef-cdk-schedule-function-schedulefunctionprops)</code>)  *No description*
  * **dispatchTargetFunctionTimeout** (<code>[Duration](#aws-cdk-lib-duration)</code>)  Specify the dispatch target function's timeout config. __*Default*__: Duration.seconds(10)
  * **enabled** (<code>boolean</code>)  Enable / Disable event rule. __*Default*__: true
  * **recentMinutes** (<code>[Duration](#aws-cdk-lib-duration)</code>)  Set recent minutes, ex: Duration.minutes(5) will limit the schedule must grand 5 minutes than now. __*Default*__: Duration.minutes(3)



### Properties


Name | Type | Description 
-----|------|-------------
**createScheduleFunction** | <code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code> | Put new schedule into table, you can trigger by API Gateway or other AWS service.
**deleteScheduleFunction** | <code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code> | Delete schedule data, you can trigger by API Gateway or other AWS service.
**dispatchTargetFunctionTimeout** | <code>[Duration](#aws-cdk-lib-duration)</code> | <span></span>
**dispatchTargetRule** | <code>[aws_events.Rule](#aws-cdk-lib-aws-events-rule)</code> | Set a event rule to invoke dispatch target function every minutes.
**fetchScheduleFunction** | <code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code> | Fetch schedule from table, you can trigger by API Gateway or other AWS service.
**listSchedulesFunction** | <code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code> | List all schedules from table, you can trigger by API Gateway or other AWS service.
**recentMinutes** | <code>[Duration](#aws-cdk-lib-duration)</code> | <span></span>
**scheduleTable** | <code>[aws_dynamodb.Table](#aws-cdk-lib-aws-dynamodb-table)</code> | Store all of schedules in DynamoDB table.
**updateScheduleFunction** | <code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code> | Update schedule data, you can trigger by API Gateway or other AWS service.

### Methods


#### addTargetFunction(targetType, targetFunctionProps) <a id="softchef-cdk-schedule-function-schedulefunction-addtargetfunction"></a>

Add a target function by targetType.

```ts
addTargetFunction(targetType: string, targetFunctionProps: TargetFunctionProps): ScheduleFunction
```

* **targetType** (<code>string</code>)  *No description*
* **targetFunctionProps** (<code>[TargetFunctionProps](#softchef-cdk-schedule-function-targetfunctionprops)</code>)  *No description*
  * **targetFunction** (<code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code>)  Specify lambda function to invoke on schedule time. 

__Returns__:
* <code>[ScheduleFunction](#softchef-cdk-schedule-function-schedulefunction)</code>



## struct ScheduleFunctionProps  <a id="softchef-cdk-schedule-function-schedulefunctionprops"></a>






Name | Type | Description 
-----|------|-------------
**dispatchTargetFunctionTimeout**? | <code>[Duration](#aws-cdk-lib-duration)</code> | Specify the dispatch target function's timeout config.<br/>__*Default*__: Duration.seconds(10)
**enabled**? | <code>boolean</code> | Enable / Disable event rule.<br/>__*Default*__: true
**recentMinutes**? | <code>[Duration](#aws-cdk-lib-duration)</code> | Set recent minutes, ex: Duration.minutes(5) will limit the schedule must grand 5 minutes than now.<br/>__*Default*__: Duration.minutes(3)



## struct TargetFunctionProps  <a id="softchef-cdk-schedule-function-targetfunctionprops"></a>






Name | Type | Description 
-----|------|-------------
**targetFunction** | <code>[aws_lambda.Function](#aws-cdk-lib-aws-lambda-function)</code> | Specify lambda function to invoke on schedule time.



