import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DashboardGateway {
  @WebSocketServer()
  server: Server;

  emitReadingCreated(data: any) {
    this.server.emit(
      'reading.created',
      data,
    );
  }

  emitPaymentCreated(data: any) {
    this.server.emit(
      'payment.created',
      data,
    );
  }

  emitCutExecuted(data: any) {
    this.server.emit(
      'cut.executed',
      data,
    );
  }
}
