export async function handler(event: { [key: string]: any }): Promise<any> {
  const context = event.context;
  if (context.success) {
    return {
      success: true,
      result: {
        created: true,
      },
    };
  } else if (context.exception) {
    throw new Error('Test Exception');
  } else {
    return 123;
  }
};