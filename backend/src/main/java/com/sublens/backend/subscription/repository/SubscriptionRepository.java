package com.sublens.backend.subscription.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import com.sublens.backend.subscription.Subscription;
import com.sublens.backend.subscription.enums.SubscriptionStatus;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    List<Subscription> findByUserId(UUID userId, Sort sort);

    List<Subscription> findByUserIdAndStatus(UUID userId, SubscriptionStatus status, Sort sort);

    List<Subscription> findByUserIdAndStatus(UUID userId, SubscriptionStatus status);

    long countByUserIdAndStatus(UUID userId, SubscriptionStatus status);
}
