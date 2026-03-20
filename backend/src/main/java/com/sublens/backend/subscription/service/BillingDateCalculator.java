package com.sublens.backend.subscription.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;

import org.springframework.stereotype.Component;

import com.sublens.backend.subscription.enums.BillingCycle;

@Component
public class BillingDateCalculator {

    public LocalDate calculate(BillingCycle cycle, Integer dayOfMonth, Integer dayOfWeek, String dateOfYear) {
        LocalDate today = LocalDate.now();
        return switch (cycle) {
            case MONTHLY -> calculateMonthly(today, dayOfMonth);
            case WEEKLY  -> calculateWeekly(today, dayOfWeek);
            case YEARLY  -> calculateYearly(today, dateOfYear);
        };
    }

    // ── MONTHLY: 이번 달 billing_day_of_month, 이미 지났으면 다음 달 ────

    private LocalDate calculateMonthly(LocalDate today, int dayOfMonth) {
        LocalDate candidate = clampToMonth(today.getYear(), today.getMonthValue(), dayOfMonth);
        if (candidate.isAfter(today)) return candidate;
        LocalDate next = today.plusMonths(1);
        return clampToMonth(next.getYear(), next.getMonthValue(), dayOfMonth);
    }

    private LocalDate clampToMonth(int year, int month, int day) {
        int max = YearMonth.of(year, month).lengthOfMonth();
        return LocalDate.of(year, month, Math.min(day, max));
    }

    // ── WEEKLY: 오늘 이후 가장 가까운 해당 요일 ─────────────────────

    private LocalDate calculateWeekly(LocalDate today, int dayOfWeek) {
        // 1=월 ~ 7=일, Java DayOfWeek.getValue() 동일
        DayOfWeek target = DayOfWeek.of(dayOfWeek);
        LocalDate candidate = today.plusDays(1);
        while (candidate.getDayOfWeek() != target) {
            candidate = candidate.plusDays(1);
        }
        return candidate;
    }

    // ── YEARLY: "MMDD" 형식, 이번 해 날짜가 지났으면 내년 ───────────

    private LocalDate calculateYearly(LocalDate today, String dateOfYear) {
        int month = Integer.parseInt(dateOfYear.substring(0, 2));
        int day   = Integer.parseInt(dateOfYear.substring(2, 4));
        LocalDate candidate = clampToMonth(today.getYear(), month, day);
        if (candidate.isAfter(today)) return candidate;
        return clampToMonth(today.getYear() + 1, month, day);
    }
}
