package com.pkms.backend.subscription;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import com.pkms.backend.subscription.enums.SubscriptionStatus;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    List<Subscription> findByUserId(UUID userId, Sort sort);

    List<Subscription> findByUserIdAndStatus(UUID userId, SubscriptionStatus status, Sort sort);

    List<Subscription> findByUserIdAndStatus(UUID userId, SubscriptionStatus status);

    long countByUserIdAndStatus(UUID userId, SubscriptionStatus status);
}
