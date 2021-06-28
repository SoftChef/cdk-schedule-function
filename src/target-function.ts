import * as lambda from '@aws-cdk/aws-lambda';

export interface TargetFunctionProps {
  readonly targetFunction: lambda.Function;
}