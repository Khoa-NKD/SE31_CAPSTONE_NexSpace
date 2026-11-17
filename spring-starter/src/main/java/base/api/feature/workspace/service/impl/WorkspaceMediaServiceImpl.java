package base.api.feature.workspace.service.impl;

import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.workspace.dto.request.AddWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.ReorderMediaItemDto;
import base.api.feature.workspace.dto.request.ReorderWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.SyncWorkspaceMediaDto;
import base.api.feature.workspace.dto.response.WorkspaceMediaResponseDto;
import base.api.feature.workspace.mapper.WorkspaceMediaMapper;
import base.api.feature.workspace.repository.IMediaRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.IWorkspaceMediaService;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.MediaModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.MediaType;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceMediaServiceImpl implements IWorkspaceMediaService {

    private final IWorkspaceRepository workspaceRepository;
    private final IMediaRepository mediaRepository;
    private final IBookableResourceRepository resourceRepository;
    private final CurrentUserProvider currentUserProvider;
    private final base.api.feature.workspace.service.IMediaStorageService mediaStorageService;

    @Override
    @Transactional(readOnly = true)
    public List<WorkspaceMediaResponseDto> getWorkspaceMedia(Long workspaceId, Long actorId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        // Publicly visible only when Workspace is ACTIVE
        if (workspace.getStatus() != WorkspaceStatus.ACTIVE) {
            boolean isOwner = actorId != null
                    && workspace.getOrganizer() != null
                    && workspace.getOrganizer().getId().equals(actorId);
            boolean isAdmin = currentUserProvider.isAdmin();

            if (!isOwner && !isAdmin) {
                // Strict Ownership Defense: 404 Not Found to prevent resource enumeration
                throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
            }
        }

        List<MediaModel> mediaList = mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
        return mediaList.stream()
                .map(WorkspaceMediaMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public WorkspaceMediaResponseDto addMedia(Long workspaceId, AddWorkspaceMediaDto dto, Long actorId) {
        WorkspaceModel workspace = getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        BookableResourceModel resource = null;
        if (dto.getResourceId() != null) {
            resource = resourceRepository.findById(dto.getResourceId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy tài nguyên với ID: " + dto.getResourceId()));
            if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null
                    || !resource.getFloorPlan().getWorkspace().getId().equals(workspaceId)) {
                throw new BadRequestException("Tài nguyên không thuộc không gian làm việc này.");
            }
        }

        int count = mediaRepository.countByWorkspaceId(workspaceId);
        boolean isCover = Boolean.TRUE.equals(dto.getIsCover()) || count == 0;

        if (isCover && count > 0) {
            // Unset previous cover photos
            List<MediaModel> existing = mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
            for (MediaModel m : existing) {
                if (m.isCover()) {
                    m.setCover(false);
                    mediaRepository.save(m);
                }
            }
        }

        int order = dto.getDisplayOrder() != null ? dto.getDisplayOrder() : count;

        MediaModel media = new MediaModel();
        media.setWorkspace(workspace);
        media.setResource(resource);
        media.setUrl(dto.getUrl().trim());
        media.setMediaType(dto.getMediaType() != null ? dto.getMediaType() : MediaType.IMAGE);
        media.setCover(isCover);
        media.setDisplayOrder(order);

        MediaModel saved = mediaRepository.save(media);
        log.info("Added media ID: {} to workspace ID: {} (cover={}) by actor ID: {}",
                saved.getId(), workspaceId, isCover, actorId);

        return WorkspaceMediaMapper.toDto(saved);
    }

    @Override
    @Transactional
    public WorkspaceMediaResponseDto uploadAndAddMedia(Long workspaceId, org.springframework.web.multipart.MultipartFile file, Boolean isCover, Long actorId) {
        WorkspaceModel workspace = getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        base.api.feature.workspace.dto.response.MediaUploadResponseDto uploadResult =
                mediaStorageService.uploadWorkspaceImage(file, workspaceId, actorId);

        int count = mediaRepository.countByWorkspaceId(workspaceId);
        boolean makeCover = Boolean.TRUE.equals(isCover) || count == 0;

        if (makeCover && count > 0) {
            List<MediaModel> existing = mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
            for (MediaModel m : existing) {
                if (m.isCover()) {
                    m.setCover(false);
                    mediaRepository.save(m);
                }
            }
        }

        MediaModel media = new MediaModel();
        media.setWorkspace(workspace);
        media.setUrl(uploadResult.getUrl().trim());
        media.setMediaType(MediaType.IMAGE);
        media.setCover(makeCover);
        media.setDisplayOrder(count);

        MediaModel saved = mediaRepository.save(media);
        log.info("Uploaded and added media ID: {} to workspace ID: {} (cover={}) by actor ID: {}",
                saved.getId(), workspaceId, makeCover, actorId);

        return WorkspaceMediaMapper.toDto(saved);
    }

    @Override
    @Transactional
    public List<WorkspaceMediaResponseDto> syncMedia(Long workspaceId, SyncWorkspaceMediaDto dto, Long actorId) {
        WorkspaceModel workspace = getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        mediaRepository.deleteByWorkspaceId(workspaceId);

        List<AddWorkspaceMediaDto> items = dto.getItems();
        if (items == null || items.isEmpty()) {
            log.info("Cleared all media for workspace ID: {} by actor ID: {}", workspaceId, actorId);
            return List.of();
        }

        int coverIndex = -1;
        for (int i = 0; i < items.size(); i++) {
            if (Boolean.TRUE.equals(items.get(i).getIsCover())) {
                coverIndex = i;
                break;
            }
        }
        if (coverIndex == -1) {
            coverIndex = 0; // Default first item to cover
        }

        List<MediaModel> toSave = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            AddWorkspaceMediaDto item = items.get(i);

            BookableResourceModel resource = null;
            if (item.getResourceId() != null) {
                resource = resourceRepository.findById(item.getResourceId())
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài nguyên với ID: " + item.getResourceId()));
                if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null
                        || !resource.getFloorPlan().getWorkspace().getId().equals(workspaceId)) {
                    throw new BadRequestException("Tài nguyên không thuộc không gian làm việc này.");
                }
            }

            int order = item.getDisplayOrder() != null ? item.getDisplayOrder() : i;

            MediaModel media = new MediaModel();
            media.setWorkspace(workspace);
            media.setResource(resource);
            media.setUrl(item.getUrl().trim());
            media.setMediaType(item.getMediaType() != null ? item.getMediaType() : MediaType.IMAGE);
            media.setCover(i == coverIndex);
            media.setDisplayOrder(order);

            toSave.add(media);
        }

        List<MediaModel> savedList = mediaRepository.saveAll(toSave);
        log.info("Synced {} media items for workspace ID: {} by actor ID: {}", savedList.size(), workspaceId, actorId);

        return savedList.stream()
                .map(WorkspaceMediaMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public WorkspaceMediaResponseDto setCover(Long workspaceId, Long mediaId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        MediaModel target = mediaRepository.findByIdAndWorkspaceId(mediaId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy ảnh với ID: " + mediaId));

        List<MediaModel> allMedia = mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
        for (MediaModel m : allMedia) {
            if (m.getId().equals(mediaId)) {
                m.setCover(true);
            } else if (m.isCover()) {
                m.setCover(false);
            }
        }
        mediaRepository.saveAll(allMedia);

        log.info("Set media ID: {} as cover for workspace ID: {} by actor ID: {}", mediaId, workspaceId, actorId);
        return WorkspaceMediaMapper.toDto(target);
    }

    @Override
    @Transactional
    public List<WorkspaceMediaResponseDto> reorderMedia(Long workspaceId, ReorderWorkspaceMediaDto dto, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        List<MediaModel> allMedia = mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId);
        Map<Long, Integer> orderMap = dto.getItems().stream()
                .collect(Collectors.toMap(ReorderMediaItemDto::getMediaId, ReorderMediaItemDto::getDisplayOrder, (a, b) -> b));

        for (MediaModel m : allMedia) {
            if (orderMap.containsKey(m.getId())) {
                m.setDisplayOrder(orderMap.get(m.getId()));
            }
        }

        mediaRepository.saveAll(allMedia);
        log.info("Reordered {} media items for workspace ID: {} by actor ID: {}",
                allMedia.size(), workspaceId, actorId);

        return mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId).stream()
                .map(WorkspaceMediaMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public void deleteMedia(Long workspaceId, Long mediaId, Long actorId) {
        getWorkspaceWithOwnershipCheck(workspaceId, actorId);

        MediaModel media = mediaRepository.findByIdAndWorkspaceId(mediaId, workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy ảnh với ID: " + mediaId));

        boolean wasCover = media.isCover();
        mediaRepository.delete(media);
        log.info("Deleted media ID: {} from workspace ID: {} by actor ID: {}", mediaId, workspaceId, actorId);

        // If the deleted photo was cover, automatically promote the first remaining photo
        if (wasCover) {
            mediaRepository.findFirstByWorkspaceIdOrderByDisplayOrderAsc(workspaceId).ifPresent(nextCover -> {
                nextCover.setCover(true);
                mediaRepository.save(nextCover);
                log.info("Auto-promoted media ID: {} as new cover for workspace ID: {}",
                        nextCover.getId(), workspaceId);
            });
        }
    }

    private WorkspaceModel getWorkspaceWithOwnershipCheck(Long workspaceId, Long actorId) {
        WorkspaceModel workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId));

        boolean isOwner = actorId != null
                && workspace.getOrganizer() != null
                && workspace.getOrganizer().getId().equals(actorId);
        boolean isAdmin = currentUserProvider.isAdmin();

        if (!isOwner && !isAdmin) {
            // Strict Ownership Defense: 404 Not Found to prevent resource enumeration
            throw new NotFoundException("Không tìm thấy không gian làm việc với ID: " + workspaceId);
        }

        return workspace;
    }
}
