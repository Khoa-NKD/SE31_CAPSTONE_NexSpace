package base.api.feature.personalization.service;

import base.api.feature.personalization.dto.request.CreateSavedSearchFilterDto;
import base.api.feature.personalization.dto.response.SavedSearchFilterDto;

import java.util.List;

public interface ISavedSearchFilterService {

    List<SavedSearchFilterDto> getMySavedFilters(Long customerId);

    SavedSearchFilterDto createSavedFilter(Long customerId, CreateSavedSearchFilterDto request);

    void deleteSavedFilter(Long customerId, Long filterId);
}

