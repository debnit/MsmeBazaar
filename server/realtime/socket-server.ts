/**
 * 🔄 Real-time Socket.IO Server
 * Live updates for match scores, buyer activity, and notifications
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

interface RoomData {
  users: Set<string>;
  type: 'msme_listing' | 'chat' | 'dashboard' | 'auction';
  metadata?: Record<string, any>;
}

export class MSMESocketServer {
  private io: SocketIOServer;
  private rooms: Map<string, RoomData> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
        const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected with role ${socket.userRole}`);

      // Track user connections
      if (socket.userId) {
        const userId = socket.userId.toString();
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);
      }

      // Join user-specific room
      socket.join(`user_${socket.userId}`);

      // Role-based room joining
      if (socket.userRole) {
        socket.join(`role_${socket.userRole}`);
      }

      // Handle room operations
      socket.on('join_room', (data: { roomId: string; type: string; metadata?: any }) => {
        this.handleJoinRoom(socket, data);
      });

      socket.on('leave_room', (data: { roomId: string }) => {
        this.handleLeaveRoom(socket, data);
      });

      // MSME listing events
      socket.on('view_listing', (data: { msmeId: string; metadata?: any }) => {
        this.handleViewListing(socket, data);
      });

      socket.on('express_interest', (data: { msmeId: string; message?: string }) => {
        this.handleExpressInterest(socket, data);
      });

      // Chat events
      socket.on('send_message', (data: { roomId: string; message: string; recipientId?: string }) => {
        this.handleSendMessage(socket, data);
      });

      socket.on('typing_start', (data: { roomId: string }) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('typing_stop', (data: { roomId: string }) => {
        this.handleTypingStop(socket, data);
      });

      // Buyer scoring events
      socket.on('track_action', (data: { action: string; msmeId?: string; metadata?: any }) => {
        this.handleTrackAction(socket, data);
      });

      // Valuation events
      socket.on('request_valuation', (data: { msmeId: string; companyData: any }) => {
        this.handleRequestValuation(socket, data);
      });

      // Auction events (for competitive bidding)
      socket.on('place_bid', (data: { msmeId: string; amount: number; terms?: any }) => {
        this.handlePlaceBid(socket, data);
      });

      // Notification events
      socket.on('mark_notification_read', (data: { notificationId: string }) => {
        this.handleMarkNotificationRead(socket, data);
      });

      // Disconnection handling
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoom(socket: AuthenticatedSocket, data: { roomId: string; type: string; metadata?: any }) {
    const { roomId, type, metadata } = data;
    
    socket.join(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Set(),
        type: type as any,
        metadata
      });
    }
    
    const room = this.rooms.get(roomId)!;
    room.users.add(socket.userId!.toString());
    
    // Notify others in the room
    socket.to(roomId).emit('user_joined', {
      userId: socket.userId,
      userRole: socket.userRole,
      timestamp: new Date().toISOString()
    });
    
    socket.emit('room_joined', {
      roomId,
      userCount: room.users.size,
      type: room.type
    });
  }

  private handleLeaveRoom(socket: AuthenticatedSocket, data: { roomId: string }) {
    const { roomId } = data;
    
    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(socket.userId!.toString());
      
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    socket.to(roomId).emit('user_left', {
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  }

  private handleViewListing(socket: AuthenticatedSocket, data: { msmeId: string; metadata?: any }) {
    const { msmeId, metadata } = data;
    
    // Track buyer activity
    this.trackBuyerActivity(socket.userId!, 'listing_view', msmeId, metadata);
    
    // Notify listing owner
    this.notifyListingOwner(msmeId, {
      type: 'listing_viewed',
      buyerId: socket.userId,
      timestamp: new Date().toISOString(),
      metadata
    });
    
    // Join listing room for real-time updates
    socket.join(`listing_${msmeId}`);
  }

  private handleExpressInterest(socket: AuthenticatedSocket, data: { msmeId: string; message?: string }) {
    const { msmeId, message } = data;
    
    // Track high-value buyer activity
    this.trackBuyerActivity(socket.userId!, 'interest_expression', msmeId, { message });
    
    // Notify listing owner immediately
    this.notifyListingOwner(msmeId, {
      type: 'interest_expressed',
      buyerId: socket.userId,
      message,
      timestamp: new Date().toISOString()
    });
    
    // Notify agents in the area
    this.notifyAgents(msmeId, {
      type: 'potential_match',
      buyerId: socket.userId,
      msmeId,
      timestamp: new Date().toISOString()
    });
  }

  private handleSendMessage(socket: AuthenticatedSocket, data: { roomId: string; message: string; recipientId?: string }) {
    const { roomId, message, recipientId } = data;
    
    const messageData = {
      id: Date.now().toString(),
      senderId: socket.userId,
      senderRole: socket.userRole,
      message,
      timestamp: new Date().toISOString(),
      recipientId
    };
    
    // Send to specific recipient or broadcast to room
    if (recipientId) {
      socket.to(`user_${recipientId}`).emit('message_received', messageData);
    } else {
      socket.to(roomId).emit('message_received', messageData);
    }
    
    // Confirm message sent
    socket.emit('message_sent', messageData);
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: { roomId: string }) {
    socket.to(data.roomId).emit('user_typing', {
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: { roomId: string }) {
    socket.to(data.roomId).emit('user_stopped_typing', {
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });
  }

  private handleTrackAction(socket: AuthenticatedSocket, data: { action: string; msmeId?: string; metadata?: any }) {
    this.trackBuyerActivity(socket.userId!, data.action, data.msmeId, data.metadata);
  }

  private handleRequestValuation(socket: AuthenticatedSocket, data: { msmeId: string; companyData: any }) {
    // Track valuation request
    this.trackBuyerActivity(socket.userId!, 'valuation_request', data.msmeId);
    
    // Emit to valuation service (would integrate with queue system)
    socket.emit('valuation_initiated', {
      msmeId: data.msmeId,
      estimatedTime: '2-3 minutes',
      timestamp: new Date().toISOString()
    });
  }

  private handlePlaceBid(socket: AuthenticatedSocket, data: { msmeId: string; amount: number; terms?: any }) {
    const { msmeId, amount, terms } = data;
    
    // Broadcast bid to all interested parties
    this.io.to(`listing_${msmeId}`).emit('bid_placed', {
      bidderId: socket.userId,
      amount,
      terms,
      timestamp: new Date().toISOString()
    });
    
    // Notify listing owner
    this.notifyListingOwner(msmeId, {
      type: 'bid_placed',
      bidderId: socket.userId,
      amount,
      terms,
      timestamp: new Date().toISOString()
    });
  }

  private handleMarkNotificationRead(socket: AuthenticatedSocket, data: { notificationId: string }) {
    // Update notification status in database
    // This would typically update the notifications table
    socket.emit('notification_read', {
      notificationId: data.notificationId,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`User ${socket.userId} disconnected`);
    
    // Clean up user socket tracking
    if (socket.userId) {
      const userId = socket.userId.toString();
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    
    // Clean up room memberships
    this.rooms.forEach((room, roomId) => {
      if (room.users.has(socket.userId!.toString())) {
        room.users.delete(socket.userId!.toString());
        socket.to(roomId).emit('user_left', {
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private trackBuyerActivity(userId: number, action: string, msmeId?: string, metadata?: any) {
    // Emit to buyer scoring service
    this.io.emit('buyer_activity', {
      userId,
      action,
      msmeId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  private notifyListingOwner(msmeId: string, notification: any) {
    // This would query the database to find the listing owner
    // For now, emit to a hypothetical owner
    this.io.to(`listing_owner_${msmeId}`).emit('listing_notification', notification);
  }

  private notifyAgents(msmeId: string, notification: any) {
    // Notify all agents in the relevant geographic area
    this.io.to('role_agent').emit('agent_notification', notification);
  }

  // Public methods for external services
  public notifyUser(userId: number, notification: any) {
    this.io.to(`user_${userId}`).emit('notification', notification);
  }

  public notifyRole(role: string, notification: any) {
    this.io.to(`role_${role}`).emit('role_notification', notification);
  }

  public broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }

  public getConnectedUsers(): number {
    return this.io.sockets.sockets.size;
  }

  public getRoomUsers(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room ? room.users.size : 0;
  }
}