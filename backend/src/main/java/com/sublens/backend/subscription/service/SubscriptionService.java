package com.sublens.backend.subscription.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sublens.backend.category.SubscriptionCategory;
import com.sublens.backend.category.repository.SubscriptionCategoryRepository;
import com.sublens.backend.global.exception.BusinessException;
import com.sublens.backend.global.exception.ErrorCode;
import com.sublens.backend.subscription.Subscription;
import com.sublens.backend.subscription.dto.SubscriptionCreateRequest;
import com.sublens.backend.subscription.dto.SubscriptionListRequest;
import com.sublens.backend.subscription.dto.SubscriptionResponse;
import com.sublens.backend.subscription.dto.SubscriptionStatusRequest;
import com.sublens.backend.subscription.dto.SubscriptionSummaryResponse;
import com.sublens.backend.subscription.dto.SubscriptionSummaryResponse.CategorySummary;
import com.sublens.backend.subscription.dto.SubscriptionUpdateRequest;
import com.sublens.backend.subscription.enums.BillingCycle;
import com.sublens.backend.subscription.enums.SubscriptionStatus;
import com.sublens.backend.subscription.repository.SubscriptionRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionService {

    private static final int FREE_PLAN_LIMIT = 5;

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionCategoryRepository categoryRepository;
    private final BillingDateCalculator billingDateCalculator;

    // ── 현재 유저 헬퍼 ──────────────────────────────────────────────

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return UUID.fromString(auth.getName());
    }

    private boolean isFreePlan() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    // ── 목록 조회 ──────────────────────────────────────────────────

    public List<SubscriptionResponse> list(SubscriptionListRequest request) {
        UUID userId = getCurrentUserId();
        Sort sort = buildSort(request.getSort());
        String statusStr = request.getStatus();

        List<Subscription> subscriptions;
        if (statusStr == null || statusStr.equalsIgnoreCase("ALL")) {
            subscriptions = subscriptionRepository.findByUserId(userId, sort);
        } else {
            SubscriptionStatus status = SubscriptionStatus.valueOf(statusStr.toUpperCase());
            subscriptions = subscriptionRepository.findByUserIdAndStatus(userId, status, sort);
        }

        if (request.getCategoryId() != null) {
            subscriptions = subscriptions.stream()
                    .filter(s -> s.getCategory() != null
                            && s.getCategory().getId().equals(request.getCategoryId()))
                    .toList();
        }

        return subscriptions.stream().map(SubscriptionResponse::from).toList();
    }

    // ── 단건 조회 ──────────────────────────────────────────────────

    public SubscriptionResponse detail(UUID id) {
        Subscription subscription = findAndVerifyOwner(id);
        return SubscriptionResponse.from(subscription);
    }

    // ── 생성 ────────────────────────────────────────────────────────

    @Transactional
    public SubscriptionResponse create(SubscriptionCreateRequest request) {
        UUID userId = getCurrentUserId();

        BillingCycle cycle = request.getBillingCycle() != null ? request.getBillingCycle() : BillingCycle.MONTHLY;
        validateBillingDayFields(cycle, request.getBillingDayOfMonth(),
                request.getBillingDayOfWeek(), request.getBillingDateOfYear());

        if (isFreePlan()) {
            long activeCount = subscriptionRepository.countByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
            if (activeCount >= FREE_PLAN_LIMIT) {
                throw new BusinessException(ErrorCode.SUBSCRIPTION_LIMIT_EXCEEDED);
            }
        }

        LocalDate nextBillingDate = billingDateCalculator.calculate(
                cycle,
                request.getBillingDayOfMonth(),
                request.getBillingDayOfWeek(),
                request.getBillingDateOfYear());

        SubscriptionCategory category = resolveCategory(request.getCategoryId());

        Subscription subscription = Subscription.builder()
                .userId(userId)
                .category(category)
                .serviceName(request.getServiceName())
                .serviceId(request.getServiceId())
                .description(request.getDescription())
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() :
                        com.sublens.backend.subscription.enums.Currency.KRW)
                .billingCycle(cycle)
                .startDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now())
                .nextBillingDate(nextBillingDate)
                .billingDayOfMonth(request.getBillingDayOfMonth())
                .billingDayOfWeek(request.getBillingDayOfWeek())
                .billingDateOfYear(request.getBillingDateOfYear())
                .notifyBefore(request.isNotifyBefore())
                .notifyDaysBefore((short) request.getNotifyDaysBefore())
                .isBundle(request.isBundle())
                .bundleId(request.getBundleId())
                .build();

        @SuppressWarnings("null")
        Subscription saved = subscriptionRepository.save(subscription);
        return SubscriptionResponse.from(saved);
    }

    // ── 수정 ────────────────────────────────────────────────────────

    @Transactional
    public SubscriptionResponse update(SubscriptionUpdateRequest request) {
        Subscription subscription = findAndVerifyOwner(request.getId());

        BillingCycle cycle = request.getBillingCycle() != null ? request.getBillingCycle() : subscription.getBillingCycle();
        validateBillingDayFields(cycle, request.getBillingDayOfMonth(),
                request.getBillingDayOfWeek(), request.getBillingDateOfYear());

        LocalDate nextBillingDate = billingDateCalculator.calculate(
                cycle,
                request.getBillingDayOfMonth(),
                request.getBillingDayOfWeek(),
                request.getBillingDateOfYear());

        SubscriptionCategory category = resolveCategory(request.getCategoryId());

        subscription.setCategory(category);
        subscription.setServiceName(request.getServiceName());
        subscription.setServiceId(request.getServiceId());
        subscription.setDescription(request.getDescription());
        subscription.setAmount(request.getAmount());
        if (request.getCurrency() != null) subscription.setCurrency(request.getCurrency());
        subscription.setBillingCycle(cycle);
        if (request.getStartDate() != null) subscription.setStartDate(request.getStartDate());
        subscription.setNextBillingDate(nextBillingDate);
        subscription.setBillingDayOfMonth(request.getBillingDayOfMonth());
        subscription.setBillingDayOfWeek(request.getBillingDayOfWeek());
        subscription.setBillingDateOfYear(request.getBillingDateOfYear());
        subscription.setNotifyBefore(request.isNotifyBefore());
        subscription.setNotifyDaysBefore((short) request.getNotifyDaysBefore());
        subscription.setBundle(request.isBundle());
        subscription.setBundleId(request.getBundleId());

        return SubscriptionResponse.from(subscription);
    }

    // ── 상태 변경 ──────────────────────────────────────────────────

    @Transactional
    public SubscriptionResponse updateStatus(SubscriptionStatusRequest request) {
        Subscription subscription = findAndVerifyOwner(request.getId());
        subscription.setStatus(request.getStatus());
        return SubscriptionResponse.from(subscription);
    }

    // ── 삭제 ────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) {
        Subscription subscription = findAndVerifyOwner(id);
        subscriptionRepository.delete(subscription);
    }

    // ── 요약 ────────────────────────────────────────────────────────

    public SubscriptionSummaryResponse summary() {
        UUID userId = getCurrentUserId();
        List<Subscription> active = subscriptionRepository.findByUserIdAndStatus(
                userId, SubscriptionStatus.ACTIVE);

        BigDecimal totalMonthly = active.stream()
                .map(s -> toMonthlyAmount(s.getAmount(), s.getBillingCycle()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalYearly = totalMonthly.multiply(BigDecimal.valueOf(12));

        List<String> currencies = active.stream()
                .map(s -> s.getCurrency().name())
                .distinct()
                .sorted()
                .toList();

        Map<String, List<Subscription>> grouped = active.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCategory() != null ? s.getCategory().getName() : "기타"));

        List<CategorySummary> byCategory = grouped.entrySet().stream()
                .map(e -> {
                    BigDecimal catAmount = e.getValue().stream()
                            .map(s -> toMonthlyAmount(s.getAmount(), s.getBillingCycle()))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new CategorySummary(e.getKey(), catAmount, e.getValue().size());
                })
                .toList();

        return new SubscriptionSummaryResponse(
                totalMonthly,
                totalYearly,
                active.size(),
                currencies,
                byCategory);
    }

    // ── 내부 헬퍼 ──────────────────────────────────────────────────

    private Subscription findAndVerifyOwner(UUID id) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBSCRIPTION_NOT_FOUND));
        if (!subscription.getUserId().equals(getCurrentUserId())) {
            throw new BusinessException(ErrorCode.SUBSCRIPTION_ACCESS_DENIED);
        }
        return subscription;
    }

    private void validateBillingDayFields(BillingCycle cycle, Integer dayOfMonth,
            Integer dayOfWeek, String dateOfYear) {
        switch (cycle) {
            case MONTHLY -> {
                if (dayOfMonth == null)
                    throw new BusinessException(ErrorCode.INVALID_BILLING_DAY);
            }
            case WEEKLY -> {
                if (dayOfWeek == null)
                    throw new BusinessException(ErrorCode.INVALID_BILLING_DAY);
            }
            case YEARLY -> {
                if (dateOfYear == null || !dateOfYear.matches("^(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$"))
                    throw new BusinessException(ErrorCode.INVALID_BILLING_DAY);
            }
        }
    }

    private SubscriptionCategory resolveCategory(UUID categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId).orElse(null);
    }

    private BigDecimal toMonthlyAmount(BigDecimal amount, BillingCycle cycle) {
        return switch (cycle) {
            case MONTHLY -> amount;
            case YEARLY  -> amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case WEEKLY  -> amount.multiply(BigDecimal.valueOf(4));
        };
    }

    private Sort buildSort(String sort) {
        return switch (sort == null ? "created_at" : sort) {
            case "next_billing_date" -> Sort.by(Sort.Direction.ASC, "nextBillingDate");
            case "amount"            -> Sort.by(Sort.Direction.DESC, "amount");
            default                  -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }
}
