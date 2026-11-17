package base.api.shared.enums;

/** Commercial configuration is independent of a resource's display name and placement. */
public enum ResourceUsageKind {
    WORK_SEAT(ResourceCategory.DESK), SOFA_SEAT(ResourceCategory.DESK), OTHER_SEAT(ResourceCategory.DESK),
    MEETING_ROOM(ResourceCategory.ROOM), PRIVATE_OFFICE(ResourceCategory.ROOM), SHARED_ROOM(ResourceCategory.ROOM), OTHER_ROOM(ResourceCategory.ROOM);
    private final ResourceCategory category;
    ResourceUsageKind(ResourceCategory category) { this.category = category; }
    public ResourceCategory category() { return category; }
}
