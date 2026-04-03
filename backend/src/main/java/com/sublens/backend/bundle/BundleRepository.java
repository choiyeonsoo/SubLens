package com.sublens.backend.bundle;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BundleRepository extends JpaRepository<BundleCatalog, UUID> {

    List<BundleCatalog> findByProviderAndIsActiveTrue(String provider);
}
