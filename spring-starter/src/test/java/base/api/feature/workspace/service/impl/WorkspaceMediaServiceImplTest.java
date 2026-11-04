package base.api.feature.workspace.service.impl;

import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.workspace.dto.request.AddWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.ReorderMediaItemDto;
import base.api.feature.workspace.dto.request.ReorderWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.SyncWorkspaceMediaDto;
import base.api.feature.workspace.dto.response.WorkspaceMediaResponseDto;
import base.api.feature.workspace.repository.IMediaRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.MediaModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.MediaType;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceMediaServiceImplTest {

    @Mock
    private IWorkspaceRepository workspaceRepository;

    @Mock
    private IMediaRepository mediaRepository;

    @Mock
    private IBookableResourceRepository resourceRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private WorkspaceMediaServiceImpl workspaceMediaService;

    private WorkspaceModel activeWorkspace;
    private WorkspaceModel draftWorkspace;
    private UserModel organizer;
    private MediaModel photo1;
    private MediaModel photo2;

    @BeforeEach
    void setUp() {
        organizer = new UserModel();
        organizer.setId(10L);

        activeWorkspace = new WorkspaceModel();
        activeWorkspace.setId(1L);
        activeWorkspace.setStatus(WorkspaceStatus.ACTIVE);
        activeWorkspace.setOrganizer(organizer);

        draftWorkspace = new WorkspaceModel();
        draftWorkspace.setId(2L);
        draftWorkspace.setStatus(WorkspaceStatus.DRAFT);
        draftWorkspace.setOrganizer(organizer);

        photo1 = new MediaModel();
        photo1.setId(101L);
        photo1.setWorkspace(activeWorkspace);
        photo1.setUrl("https://res.cloudinary.com/test/image1.jpg");
        photo1.setMediaType(MediaType.IMAGE);
        photo1.setCover(true);
        photo1.setDisplayOrder(0);

        photo2 = new MediaModel();
        photo2.setId(102L);
        photo2.setWorkspace(activeWorkspace);
        photo2.setUrl("https://res.cloudinary.com/test/image2.jpg");
        photo2.setMediaType(MediaType.IMAGE);
        photo2.setCover(false);
        photo2.setDisplayOrder(1);
    }

    @Test
    @DisplayName("getWorkspaceMedia: Xem công khai khi không gian ACTIVE")
    void getWorkspaceMedia_activeWorkspace_publicAccess_success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(1L)).thenReturn(List.of(photo1, photo2));

        List<WorkspaceMediaResponseDto> result = workspaceMediaService.getWorkspaceMedia(1L, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(101L);
        assertThat(result.get(0).isCover()).isTrue();
        assertThat(result.get(1).getId()).isEqualTo(102L);
        assertThat(result.get(1).isCover()).isFalse();
    }

    @Test
    @DisplayName("getWorkspaceMedia: Chủ sở hữu xem được khi không gian DRAFT")
    void getWorkspaceMedia_draftWorkspace_ownerAccess_success() {
        when(workspaceRepository.findById(2L)).thenReturn(Optional.of(draftWorkspace));
        when(mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(2L)).thenReturn(List.of(photo1));

        List<WorkspaceMediaResponseDto> result = workspaceMediaService.getWorkspaceMedia(2L, 10L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("getWorkspaceMedia: Ném 404 Not Found khi người lạ xem không gian DRAFT")
    void getWorkspaceMedia_draftWorkspace_nonOwner_throwsNotFound() {
        when(workspaceRepository.findById(2L)).thenReturn(Optional.of(draftWorkspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);

        assertThatThrownBy(() -> workspaceMediaService.getWorkspaceMedia(2L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: 2");
    }

    @Test
    @DisplayName("addMedia: Tự động đặt làm cover khi thêm ảnh đầu tiên của workspace")
    void addMedia_firstPhoto_autoSetsCover() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.countByWorkspaceId(1L)).thenReturn(0);
        when(mediaRepository.save(any(MediaModel.class))).thenAnswer(invocation -> {
            MediaModel m = invocation.getArgument(0);
            m.setId(201L);
            return m;
        });

        AddWorkspaceMediaDto dto = AddWorkspaceMediaDto.builder()
                .url("https://res.cloudinary.com/test/first.jpg")
                .isCover(false) // Caller passed false, but since it's the first photo, it must become cover
                .build();

        WorkspaceMediaResponseDto result = workspaceMediaService.addMedia(1L, dto, 10L);

        assertThat(result.getId()).isEqualTo(201L);
        assertThat(result.isCover()).isTrue();
        assertThat(result.getUrl()).isEqualTo("https://res.cloudinary.com/test/first.jpg");
    }

    @Test
    @DisplayName("addMedia: Khi thêm ảnh với isCover=true thì hạ cover của ảnh cũ")
    void addMedia_explicitCover_unsetsPreviousCover() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.countByWorkspaceId(1L)).thenReturn(1);
        when(mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(1L)).thenReturn(List.of(photo1));
        when(mediaRepository.save(any(MediaModel.class))).thenAnswer(invocation -> {
            MediaModel m = invocation.getArgument(0);
            if (m.getId() == null) {
                m.setId(202L);
            }
            return m;
        });

        AddWorkspaceMediaDto dto = AddWorkspaceMediaDto.builder()
                .url("https://res.cloudinary.com/test/new-cover.jpg")
                .isCover(true)
                .build();

        WorkspaceMediaResponseDto result = workspaceMediaService.addMedia(1L, dto, 10L);

        assertThat(result.getId()).isEqualTo(202L);
        assertThat(result.isCover()).isTrue();
        assertThat(photo1.isCover()).isFalse(); // Previous cover must be unset
        verify(mediaRepository).save(photo1);
    }

    @Test
    @DisplayName("addMedia: Ném 400 BadRequest khi resourceId thuộc không gian khác")
    void addMedia_resourceMismatch_throwsBadRequest() {
        WorkspaceModel otherWorkspace = new WorkspaceModel();
        otherWorkspace.setId(99L);

        base.api.shared.entity.resource.FloorPlanModel floorPlan = new base.api.shared.entity.resource.FloorPlanModel();
        floorPlan.setWorkspace(otherWorkspace);

        BookableResourceModel resource = new BookableResourceModel();
        resource.setId(50L);
        resource.setFloorPlan(floorPlan);

        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(resourceRepository.findById(50L)).thenReturn(Optional.of(resource));

        AddWorkspaceMediaDto dto = AddWorkspaceMediaDto.builder()
                .url("https://res.cloudinary.com/test/res.jpg")
                .resourceId(50L)
                .build();

        assertThatThrownBy(() -> workspaceMediaService.addMedia(1L, dto, 10L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài nguyên không thuộc không gian làm việc này");
    }

    @Test
    @DisplayName("setCover: Đặt ảnh mục tiêu làm cover và bỏ cover của ảnh khác")
    void setCover_success_unsetsOthers() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.findByIdAndWorkspaceId(102L, 1L)).thenReturn(Optional.of(photo2));
        when(mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(1L)).thenReturn(List.of(photo1, photo2));

        WorkspaceMediaResponseDto result = workspaceMediaService.setCover(1L, 102L, 10L);

        assertThat(photo2.isCover()).isTrue();
        assertThat(photo1.isCover()).isFalse();
        verify(mediaRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("setCover: Ném 404 Not Found khi ảnh không tồn tại")
    void setCover_notFound_throwsNotFound() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.findByIdAndWorkspaceId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workspaceMediaService.setCover(1L, 999L, 10L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy ảnh với ID: 999");
    }

    @Test
    @DisplayName("reorderMedia: Cập nhật thứ tự hiển thị thành công")
    void reorderMedia_success() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.findByWorkspaceIdOrderByDisplayOrderAsc(1L)).thenReturn(List.of(photo1, photo2));

        ReorderWorkspaceMediaDto dto = ReorderWorkspaceMediaDto.builder()
                .items(List.of(
                        ReorderMediaItemDto.builder().mediaId(101L).displayOrder(5).build(),
                        ReorderMediaItemDto.builder().mediaId(102L).displayOrder(0).build()
                ))
                .build();

        workspaceMediaService.reorderMedia(1L, dto, 10L);

        assertThat(photo1.getDisplayOrder()).isEqualTo(5);
        assertThat(photo2.getDisplayOrder()).isEqualTo(0);
        verify(mediaRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("deleteMedia: Xóa ảnh thường (không phải cover) thành công")
    void deleteMedia_nonCover_deletesSuccessfully() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.findByIdAndWorkspaceId(102L, 1L)).thenReturn(Optional.of(photo2));

        workspaceMediaService.deleteMedia(1L, 102L, 10L);

        verify(mediaRepository).delete(photo2);
        verify(mediaRepository, never()).findFirstByWorkspaceIdOrderByDisplayOrderAsc(any());
    }

    @Test
    @DisplayName("deleteMedia: Khi xóa ảnh cover thì tự động đôn ảnh còn lại lên làm cover")
    void deleteMedia_cover_autoPromotesRemainingCover() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.findByIdAndWorkspaceId(101L, 1L)).thenReturn(Optional.of(photo1));
        when(mediaRepository.findFirstByWorkspaceIdOrderByDisplayOrderAsc(1L)).thenReturn(Optional.of(photo2));

        workspaceMediaService.deleteMedia(1L, 101L, 10L);

        verify(mediaRepository).delete(photo1);
        assertThat(photo2.isCover()).isTrue();
        verify(mediaRepository).save(photo2);
    }

    @Test
    @DisplayName("syncMedia: Đồng bộ danh sách ảnh và tự động đặt ảnh đầu tiên làm cover")
    void syncMedia_setsFirstAsCover() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(mediaRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        SyncWorkspaceMediaDto dto = SyncWorkspaceMediaDto.builder()
                .items(List.of(
                        AddWorkspaceMediaDto.builder().url("https://res.cloudinary.com/test/a.jpg").build(),
                        AddWorkspaceMediaDto.builder().url("https://res.cloudinary.com/test/b.jpg").build()
                ))
                .build();

        List<WorkspaceMediaResponseDto> result = workspaceMediaService.syncMedia(1L, dto, 10L);

        verify(mediaRepository).deleteByWorkspaceId(1L);
        assertThat(result).hasSize(2);
        assertThat(result.get(0).isCover()).isTrue();
        assertThat(result.get(1).isCover()).isFalse();
    }

    @Test
    @DisplayName("Strict Ownership Defense: Người lạ thao tác ném 404 Not Found")
    void strictOwnershipDefense_nonOwner_throwsNotFound() {
        when(workspaceRepository.findById(1L)).thenReturn(Optional.of(activeWorkspace));
        when(currentUserProvider.isAdmin()).thenReturn(false);

        assertThatThrownBy(() -> workspaceMediaService.deleteMedia(1L, 101L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: 1");
    }
}
