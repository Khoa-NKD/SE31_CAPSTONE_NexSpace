package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDecorations;
import base.api.shared.entity.resource.BookableResourceModel;

/** Matches the frontend room-local door boundary rule; all measurements are model pixels. */
final class RoomDoorGeometry {
    private RoomDoorGeometry() {}

    static boolean onBoundary(FloorDecorations.Item door, BookableResourceModel room) {
        if (door.icon() != FloorDecorations.Icon.DOOR || room.getPosX() == null || room.getPosY() == null
                || room.getWidth() == null || room.getHeight() == null) return false;
        double angle = Math.toRadians(room.getRotation() == null ? 0 : room.getRotation().doubleValue());
        double relative = Math.toRadians(door.rotation().doubleValue()) - angle;
        if (Math.min(Math.abs(Math.sin(relative)), Math.abs(Math.cos(relative))) > 0.0001) return false;
        double dx = door.posX().doubleValue() + door.width().doubleValue() / 2
                - room.getPosX().doubleValue() - room.getWidth().doubleValue() / 2;
        double dy = door.posY().doubleValue() + door.height().doubleValue() / 2
                - room.getPosY().doubleValue() - room.getHeight().doubleValue() / 2;
        double x = Math.cos(angle) * dx + Math.sin(angle) * dy + room.getWidth().doubleValue() / 2;
        double y = -Math.sin(angle) * dx + Math.cos(angle) * dy + room.getHeight().doubleValue() / 2;
        double w = Math.abs(Math.cos(relative)) * door.width().doubleValue() + Math.abs(Math.sin(relative)) * door.height().doubleValue();
        double h = Math.abs(Math.sin(relative)) * door.width().doubleValue() + Math.abs(Math.cos(relative)) * door.height().doubleValue();
        double rw = room.getWidth().doubleValue(), rh = room.getHeight().doubleValue(), epsilon = 0.02;
        return h <= w / 3 && x - w / 2 >= epsilon && x + w / 2 <= rw - epsilon
                && (Math.abs(y) <= h / 2 + epsilon || Math.abs(y - rh) <= h / 2 + epsilon)
                || w <= h / 3 && y - h / 2 >= epsilon && y + h / 2 <= rh - epsilon
                && (Math.abs(x) <= w / 2 + epsilon || Math.abs(x - rw) <= w / 2 + epsilon);
    }
}
