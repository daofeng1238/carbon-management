import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 50001;
    let message = '服务器错误';
    let data: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse() as any;
      message = typeof resp === 'string' ? resp : resp.message || message;

      if (status === 400) { code = 40001; }
      else if (status === 401) { code = 40101; message = '未登录或 token 过期'; }
      else if (status === 403) { code = 40301; message = '无权访问该资源'; }
      else if (status === 404) { code = 40401; message = '资源不存在'; }
      else if (status === 409) { code = 40901; }
      else if (status === 422) { code = 42201; }

      if (typeof resp === 'object' && resp.data) data = resp.data;
    }

    response.status(status).json({ code, data, message });
  }
}
