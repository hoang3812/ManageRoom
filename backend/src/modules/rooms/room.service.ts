import prisma from '../../config/database';
import cloudinary from '../../config/cloudinary';
import { sendSuccess, sendError, buildPaginationMeta, calculateSkip } from '../../utils/response';
import { CreateRoomDto, UpdateRoomDto, RoomQueryDto } from './room.schema';
import { RoomStatus } from '@prisma/client';

export const getAllRooms = async (query: RoomQueryDto) => {
  const { page = 1, limit = 10, search, propertyId, status, roomTypeId } = query;

  const where: Record<string, unknown> = {};
  if (search) {
    where.roomNumber = { contains: search, mode: 'insensitive' };
  }
  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;
  if (roomTypeId) where.roomTypeId = roomTypeId;

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      skip: calculateSkip(page, limit),
      take: limit,
      include: {
        property: { select: { id: true, name: true } },
        roomType: { select: { id: true, name: true } },
        contracts: {
          where: { status: { in: ['ACTIVE', 'PENDING'] } },
          include: {
            tenant: { include: { user: { select: { fullName: true, phone: true } } } },
          },
          take: 1,
        },
      },
      orderBy: [{ propertyId: 'asc' }, { roomNumber: 'asc' }],
    }),
    prisma.room.count({ where }),
  ]);

  return { rooms, meta: buildPaginationMeta(page, limit, total) };
};

export const getRoomById = async (id: string) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      property: true,
      roomType: true,
      contracts: {
        include: {
          tenant: { include: { user: { select: { id: true, fullName: true, email: true, phone: true, avatar: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
      utilityReadings: { orderBy: { year: 'desc' }, take: 6 },
      maintenanceRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!room) throw new Error('Không tìm thấy phòng');
  return room;
};

export const createRoom = async (data: CreateRoomDto) => {
  // Check room number uniqueness within property
  const existing = await prisma.room.findUnique({
    where: { propertyId_roomNumber: { propertyId: data.propertyId, roomNumber: data.roomNumber } },
  });
  if (existing) throw new Error('Số phòng đã tồn tại trong khu trọ này');

  const room = await prisma.room.create({
    data,
    include: { property: { select: { id: true, name: true } }, roomType: true },
  });
  return room;
};

export const updateRoom = async (id: string, data: UpdateRoomDto) => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new Error('Không tìm thấy phòng');

  const updated = await prisma.room.update({
    where: { id },
    data,
    include: { property: { select: { id: true, name: true } }, roomType: true },
  });
  return updated;
};

export const deleteRoom = async (id: string) => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new Error('Không tìm thấy phòng');

  const activeContract = await prisma.contract.findFirst({
    where: { roomId: id, status: 'ACTIVE' },
  });
  if (activeContract) throw new Error('Không thể xóa phòng đang có hợp đồng active');

  await prisma.room.delete({ where: { id } });
};

export const uploadRoomImages = async (id: string, files: Express.Multer.File[]) => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new Error('Không tìm thấy phòng');

  const uploadPromises = files.map(file => {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'rms/rooms', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
  });

  const urls = await Promise.all(uploadPromises);
  const updated = await prisma.room.update({
    where: { id },
    data: { images: { push: urls } },
  });
  return updated;
};

export const getRoomTypes = async () => {
  return prisma.roomType.findMany({ orderBy: { name: 'asc' } });
};

export const createRoomType = async (name: string, description?: string) => {
  return prisma.roomType.create({ data: { name, description } });
};

export const updateRoomStatus = async (id: string, status: RoomStatus) => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new Error('Không tìm thấy phòng');
  return prisma.room.update({ where: { id }, data: { status } });
};
