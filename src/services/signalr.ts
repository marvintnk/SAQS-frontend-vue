import * as signalR from '@microsoft/signalr';

type AssignmentUpdateCallback = (assignmentId: string) => void;

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private callbacks: AssignmentUpdateCallback[] = [];

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/api/Assignment/Notify', {
        // Standard Transport Negotiation (WebSockets -> SSE -> Long Polling)
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.on('OnAssignmentUpdated', (assignmentId: string) => {
      console.log('SignalR: Assignment updated', assignmentId);
      this.callbacks.forEach(cb => cb(assignmentId));
    });
  }

  public async start() {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await this.connection.start();
        console.log('SignalR Connected');
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
        // Retry logic: AutomaticReconnect greift nur bei Verbindungsabbruch NACH erfolgreichem Connect.
        // Initial müssen wir selbst retrien.
        setTimeout(() => this.start(), 5000);
      }
    }
  }

  public onAssignmentUpdated(callback: AssignmentUpdateCallback) {
    this.callbacks.push(callback);
  }
  
  public offAssignmentUpdated(callback: AssignmentUpdateCallback) {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }
}

export const signalRService = new SignalRService();
