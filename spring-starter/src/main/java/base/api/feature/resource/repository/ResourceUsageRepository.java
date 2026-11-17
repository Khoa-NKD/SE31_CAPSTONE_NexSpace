package base.api.feature.resource.repository;

import base.api.shared.enums.BookingStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class ResourceUsageRepository {
    @PersistenceContext private EntityManager em;

    /** Read-only occupancy snapshot; half-open intervals allow back-to-back reservations. */
    public java.util.Map<
                    Long,
                    java.util.Set<base.api.feature.resource.dto.FloorManagement.AvailabilityState>>
            occupancy(Long floorId, LocalDateTime from, LocalDateTime to, LocalDateTime now) {
        var result =
                new java.util.HashMap<
                        Long,
                        java.util.Set<
                                base.api.feature.resource.dto.FloorManagement.AvailabilityState>>();
        var bookings =
                em.createQuery(
                                "select b.resource.id, b.status, b.holdExpiresAt from BookingModel"
                                    + " b where b.resource.floorPlan.id=:floor and b.startTime<:to"
                                    + " and b.endTime>:from and b.status in :statuses",
                                Object[].class)
                        .setParameter("floor", floorId)
                        .setParameter("from", from)
                        .setParameter("to", to)
                        .setParameter(
                                "statuses",
                                List.of(
                                        BookingStatus.CONFIRMED,
                                        BookingStatus.CHECKED_IN,
                                        BookingStatus.PENDING_APPROVAL,
                                        BookingStatus.PENDING_PAYMENT))
                        .getResultList();
        for (var row : bookings) {
            var status = (BookingStatus) row[1];
            var expiry = (LocalDateTime) row[2];
            boolean confirmed =
                    status == BookingStatus.CONFIRMED || status == BookingStatus.CHECKED_IN;
            // Pending records without an expiry remain blocked; do not invent a release time.
            if (!confirmed && expiry != null && !expiry.isAfter(now)) continue;
            result.computeIfAbsent(
                            (Long) row[0],
                            ignored ->
                                    java.util.EnumSet.noneOf(
                                            base.api.feature.resource.dto.FloorManagement
                                                    .AvailabilityState.class))
                    .add(
                            confirmed
                                    ? base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.BOOKED
                                    : base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.LOCKED);
        }
        var blocks =
                em.createQuery(
                                "select b.resource.id, b.blockType from ResourceBlockedSlotModel b"
                                    + " where b.resource.floorPlan.id=:floor and b.startTime<:to"
                                    + " and b.endTime>:from",
                                Object[].class)
                        .setParameter("floor", floorId)
                        .setParameter("from", from)
                        .setParameter("to", to)
                        .getResultList();
        for (var row : blocks)
            result.computeIfAbsent(
                            (Long) row[0],
                            ignored ->
                                    java.util.EnumSet.noneOf(
                                            base.api.feature.resource.dto.FloorManagement
                                                    .AvailabilityState.class))
                    .add(
                            row[1] == base.api.shared.enums.ResourceBlockType.MAINTENANCE
                                    ? base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.MAINTENANCE
                                    : base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.LOCKED);
        return result;
    }

    /** Read-only occupancy snapshot across the entire workspace (all floors). */
    public java.util.Map<
                    Long,
                    java.util.Set<base.api.feature.resource.dto.FloorManagement.AvailabilityState>>
            occupancyByWorkspace(Long workspaceId, LocalDateTime from, LocalDateTime to, LocalDateTime now) {
        var result =
                new java.util.HashMap<
                        Long,
                        java.util.Set<
                                base.api.feature.resource.dto.FloorManagement.AvailabilityState>>();
        var bookings =
                em.createQuery(
                                "select b.resource.id, b.status, b.holdExpiresAt from BookingModel"
                                    + " b where b.resource.floorPlan.workspace.id=:workspace and b.startTime<:to"
                                    + " and b.endTime>:from and b.status in :statuses",
                                Object[].class)
                        .setParameter("workspace", workspaceId)
                        .setParameter("from", from)
                        .setParameter("to", to)
                        .setParameter(
                                "statuses",
                                List.of(
                                        BookingStatus.CONFIRMED,
                                        BookingStatus.CHECKED_IN,
                                        BookingStatus.PENDING_APPROVAL,
                                        BookingStatus.PENDING_PAYMENT))
                        .getResultList();
        for (var row : bookings) {
            var status = (BookingStatus) row[1];
            var expiry = (LocalDateTime) row[2];
            boolean confirmed =
                    status == BookingStatus.CONFIRMED || status == BookingStatus.CHECKED_IN;
            if (!confirmed && expiry != null && !expiry.isAfter(now)) continue;
            result.computeIfAbsent(
                            (Long) row[0],
                            ignored ->
                                    java.util.EnumSet.noneOf(
                                            base.api.feature.resource.dto.FloorManagement
                                                    .AvailabilityState.class))
                    .add(
                            confirmed
                                    ? base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.BOOKED
                                    : base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.LOCKED);
        }
        var blocks =
                em.createQuery(
                                "select b.resource.id, b.blockType from ResourceBlockedSlotModel b"
                                    + " where b.resource.floorPlan.workspace.id=:workspace and b.startTime<:to"
                                    + " and b.endTime>:from",
                                Object[].class)
                        .setParameter("workspace", workspaceId)
                        .setParameter("from", from)
                        .setParameter("to", to)
                        .getResultList();
        for (var row : blocks)
            result.computeIfAbsent(
                            (Long) row[0],
                            ignored ->
                                    java.util.EnumSet.noneOf(
                                            base.api.feature.resource.dto.FloorManagement
                                                    .AvailabilityState.class))
                    .add(
                            row[1] == base.api.shared.enums.ResourceBlockType.MAINTENANCE
                                    ? base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.MAINTENANCE
                                    : base.api.feature.resource.dto.FloorManagement
                                            .AvailabilityState.LOCKED);
        return result;
    }

    public boolean hasAnyBooking(Long resourceId) {
        return count("BookingModel", resourceId) > 0;
    }

    public boolean hasLiveBooking(Long resourceId, LocalDateTime now) {
        return em.createQuery(
                                "select count(b) from BookingModel b where b.resource.id=:id and"
                                        + " (b.status=:checkedIn or (b.endTime>:now and b.status in"
                                        + " :statuses))",
                                Long.class)
                        .setParameter("id", resourceId)
                        .setParameter("checkedIn", BookingStatus.CHECKED_IN)
                        .setParameter("now", now)
                        .setParameter(
                                "statuses",
                                List.of(
                                        BookingStatus.PENDING_APPROVAL,
                                        BookingStatus.PENDING_PAYMENT,
                                        BookingStatus.CONFIRMED))
                        .getSingleResult()
                > 0;
    }

    public boolean hasOtherDependencies(Long resourceId) {
        // A fixed entity allowlist retains related media, inventory, pricing and blocked-slot
        // records.
        return List.of(
                        "PricingRuleModel",
                        "WorkspaceAssetModel",
                        "WorkspaceAmenityModel",
                        "MediaModel",
                        "ResourceBlockedSlotModel")
                .stream()
                .anyMatch(entity -> count(entity, resourceId) > 0);
    }

    private long count(String entity, Long id) {
        return em.createQuery(
                        "select count(r) from " + entity + " r where r.resource.id=:id", Long.class)
                .setParameter("id", id)
                .getSingleResult();
    }
}
