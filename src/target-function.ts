import {
  Function,
} from 'aws-cdk-lib/aws-lambda';

export interface TargetFunctionProps {
  /**
   * Specify lambda function to invoke on schedule time
   */
  readonly targetFunction: Function;
}