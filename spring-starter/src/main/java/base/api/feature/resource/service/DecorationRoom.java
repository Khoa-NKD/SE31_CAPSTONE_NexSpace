package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDecorations;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.enums.ResourceCategory;
import java.util.Comparator;
import java.util.List;

/** Resolve a furniture item's room using the same rotated floor coordinates as the canvas. */
public final class DecorationRoom {
    private DecorationRoom() {}
    public static BookableResourceModel parent(FloorDecorations.Item item, List<BookableResourceModel> rooms,
            FloorPlanModel floor, boolean published) {
        var snapshot = published ? PublishedGeometry.read(floor) : null;
        double x=item.posX().doubleValue()+item.width().doubleValue()/2;
        double y=item.posY().doubleValue()+item.height().doubleValue()/2;
        return rooms.stream().filter(r -> r.getResourceType().getCategory()==ResourceCategory.ROOM)
            .filter(r -> snapshot==null || snapshot.containsKey(r.getId()))
            .filter(r -> {
                var p=snapshot==null?PublishedGeometry.placement(r):snapshot.get(r.getId());
                if(p.posX()==null||p.posY()==null||p.width()==null||p.height()==null)return false;
                double w=p.width().doubleValue(),h=p.height().doubleValue();
                double dx=x-p.posX().doubleValue()-w/2,dy=y-p.posY().doubleValue()-h/2;
                double angle=Math.toRadians(p.rotation()==null?0:p.rotation().doubleValue());
                double localX=dx*Math.cos(angle)+dy*Math.sin(angle);
                double localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
                return Math.abs(localX)<=w/2+0.01 && Math.abs(localY)<=h/2+0.01;
            }).min(Comparator.comparing(r -> { var p = snapshot == null ? PublishedGeometry.placement(r) : snapshot.get(r.getId()); return p.width().multiply(p.height()); })).orElse(null);
    }
}
