export type UseCaseResult<T = void> =
  | {
      ok: true;
      data?: T;
      message?: string;
    }
  | {
      ok: false;
      message: string;
    };
