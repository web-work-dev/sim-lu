import { BadRequestException } from "@sim-lu/error";
import {
    Injectable,
    MutableHttpResponse,
    type ExceptionFilter,
    type ExecutionContext,
} from "@sim-lu/core";

@Injectable({ scope: "singleton" })
export class ValidationExceptionFilter implements ExceptionFilter {
    public catch(
        exception: unknown,
        context: ExecutionContext,
    ): unknown {
        if (exception instanceof BadRequestException) {
            const response = context.get<MutableHttpResponse>("response");

            if (response) {
                response.setStatus(400);
                response.send({
                    success: false,
                    error: "Validation Failed",
                    message: exception.message,
                    details: exception.details,
                });
            }

            return;
        }

        throw exception;
    }
}
