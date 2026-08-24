import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function createHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/test', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;

    return { host, json, status };
  }

  it('returns structured 4xx responses', () => {
    const { host, json, status } = createHost();

    filter.catch(
      new HttpException('Bad request', HttpStatus.BAD_REQUEST),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Bad request',
    });
  });

  it('hides internal error details behind a generic 500 response', () => {
    const { host, json, status } = createHost();

    filter.catch(new Error('database exploded with secret'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });
});
