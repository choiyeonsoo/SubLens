package com.sublens.backend.subscription.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sublens.backend.subscription.ServiceCategory;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {

    List<ServiceCategory> findAllByOrderByDisplayOrderAsc();

    boolean existsByName(String name);
}
