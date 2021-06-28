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



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new ScheduleFunction(scope: Construct, id: string, props?: ScheduleFunctionProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[ScheduleFunctionProps](#softchef-cdk-schedule-function-schedulefunctionprops)</code>)  *No description*
  * **dispatchTargetFunctionTimeout** (<code>[Duration](#aws-cdk-core-duration)</code>)  Specify the dispatch target function's timeout config. __*Optional*__
  * **enabled** (<code>boolean</code>)  Enable / Disable event rule. __*Optional*__
  * **recentMinutes** (<code>[Duration](#aws-cdk-core-duration)</code>)  Set recent minutes, ex: cdk.Duration.minutes(5) will limit the schedule must grand 5 minutes than now. __*Optional*__



### Properties


Name | Type | Description 
-----|------|-------------
**createScheduleFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | <span></span>
**deleteScheduleFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | <span></span>
**dispatchTagetFunctionTimeout** | <code>[Duration](#aws-cdk-core-duration)</code> | <span></span>
**dispatchTargetRule** | <code>[Rule](#aws-cdk-aws-events-rule)</code> | <span></span>
**fetchScheduleFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | <span></span>
**listSchedulesFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | <span></span>
**recentMinutes** | <code>[Duration](#aws-cdk-core-duration)</code> | <span></span>
**scheduleTable** | <code>[Table](#aws-cdk-aws-dynamodb-table)</code> | <span></span>
**updateScheduleFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | <span></span>

### Methods


#### addTargetFunction(targetType, targetFunctionProps) <a id="softchef-cdk-schedule-function-schedulefunction-addtargetfunction"></a>



```ts
addTargetFunction(targetType: string, targetFunctionProps: TargetFunctionProps): ScheduleFunction
```

* **targetType** (<code>string</code>)  *No description*
* **targetFunctionProps** (<code>[TargetFunctionProps](#softchef-cdk-schedule-function-targetfunctionprops)</code>)  *No description*
  * **targetFunction** (<code>[Function](#aws-cdk-aws-lambda-function)</code>)  *No description* 

__Returns__:
* <code>[ScheduleFunction](#softchef-cdk-schedule-function-schedulefunction)</code>



## struct ScheduleFunctionProps  <a id="softchef-cdk-schedule-function-schedulefunctionprops"></a>






Name | Type | Description 
-----|------|-------------
**dispatchTargetFunctionTimeout**? | <code>[Duration](#aws-cdk-core-duration)</code> | Specify the dispatch target function's timeout config.<br/>__*Optional*__
**enabled**? | <code>boolean</code> | Enable / Disable event rule.<br/>__*Optional*__
**recentMinutes**? | <code>[Duration](#aws-cdk-core-duration)</code> | Set recent minutes, ex: cdk.Duration.minutes(5) will limit the schedule must grand 5 minutes than now.<br/>__*Optional*__



## struct TargetFunctionProps  <a id="softchef-cdk-schedule-function-targetfunctionprops"></a>






Name | Type | Description 
-----|------|-------------
**targetFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | <span></span>



