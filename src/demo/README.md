## Demo Stacks

### Initialize

Clone repository

```
git clone https://github.com/SoftChef/cdk-schedule-function.git
```

### Installation

```
yarn add projen
npx projen
```

### Build

```
npx projen build
```

### Deploy

```
cdk deploy --app ./lib/demo/demo.js
```

### APIs

Get the API Gateway endpoint

Create a schedule

```
POST: https://<apiId>.execute-api.<region>.amazonaws.com/prod/schedules

// Post data
{
  "targetType": "TestTarget",
  "schedules": [
    timestamp1,
    timestamp2
    ...
  ],
  "description": "Do some thing",
  "context": {} // You can pass an object to your target function when invoking at schedule time.
}
```

Get schedules list

```
GET: https://<apiId>.execute-api.<region>.amazonaws.com/prod/schedules
```

Get schedule by ID

```
GET: https://<apiId>.execute-api.<region>.amazonaws.com/prod/schedules/{scheduleId}
```

Update a schedule

```
PUT: https://<apiId>.execute-api.<region>.amazonaws.com/prod/schedules/{scheduleId}

// Post data
{
  "description": "Do some thing",
  "context": {} // You can pass an object to your target function when invoking at schedule time.
}
```

Delete/Cancel a schedule

```
DELETE: https://<apiId>.execute-api.<region>.amazonaws.com/prod/schedules/{scheduleId}
```
