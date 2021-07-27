import * as lambda from '@aws-cdk/aws-lambda';

export interface TargetFunctionProps {
  /**
   * Specify lambda function to invoke on schedule time
   */
  readonly targetFunction: lambda.Function;
}