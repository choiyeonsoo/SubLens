package com.sublens.backend.subscription.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.sublens.backend.subscription.ServiceCatalog;

public interface ServiceCatalogRepository
        extends JpaRepository<ServiceCatalog, UUID> {

    @Query("""
        SELECT s FROM ServiceCatalog s
        JOIN FETCH s.category c
        WHERE s.isActive = true
        ORDER BY c.displayOrder ASC, s.displayOrder ASC
    """)
    List<ServiceCatalog> findAllActiveOrdered();

    @Query("""
        SELECT s FROM ServiceCatalog s
        JOIN FETCH s.category c
        ORDER BY c.displayOrder ASC, s.displayOrder ASC
    """)
    List<ServiceCatalog> findAllOrderedForAdmin();

    boolean existsByCategoryId(UUID categoryId);
}
