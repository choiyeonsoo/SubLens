package com.sublens.backend.category.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sublens.backend.category.SubscriptionCategory;

public interface SubscriptionCategoryRepository extends JpaRepository<SubscriptionCategory, UUID> {

    List<SubscriptionCategory> findAllByOrderByNameAsc();
}
