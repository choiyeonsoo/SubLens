package com.pkms.backend.category;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionCategoryRepository extends JpaRepository<SubscriptionCategory, UUID> {

    List<SubscriptionCategory> findAllByOrderByNameAsc();
}
