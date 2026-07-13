package com.siupo.restaurant.repository;

import com.siupo.restaurant.enums.EProductStatus;
import com.siupo.restaurant.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>,
        JpaSpecificationExecutor<Product> {
    List<Product> findByNameContainingIgnoreCase(String name);

    @Query("""
            SELECT p FROM Product p
            WHERE p.status IS NULL OR p.status <> com.siupo.restaurant.enums.EProductStatus.DELETED
            """)
    Page<Product> findAllActive(Pageable pageable);

    @Query("""
            SELECT p FROM Product p
            WHERE p.id = :id
              AND (p.status IS NULL OR p.status <> com.siupo.restaurant.enums.EProductStatus.DELETED)
            """)
    java.util.Optional<Product> findActiveById(@Param("id") Long id);

    @Query("""
            SELECT p FROM Product p
            WHERE p.id IN :ids
              AND (p.status IS NULL OR p.status <> com.siupo.restaurant.enums.EProductStatus.DELETED)
            """)
    List<Product> findActiveByIdIn(@Param("ids") List<Long> ids);
}
