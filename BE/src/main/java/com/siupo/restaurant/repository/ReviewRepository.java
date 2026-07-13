package com.siupo.restaurant.repository;

import com.siupo.restaurant.model.OrderItem;
import com.siupo.restaurant.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    Optional<Review> findByOrderItem(OrderItem orderItem);
    
    @Query("SELECT r FROM Review r WHERE r.orderItem.id = :orderItemId")
    Optional<Review> findByOrderItemId(@Param("orderItemId") Long orderItemId);
    
    @Query("SELECT r FROM Review r WHERE r.orderItem.order.id = :orderId")
    List<Review> findByOrderId(@Param("orderId") Long orderId);
    
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.hidden = false ORDER BY r.createdAt DESC")
    List<Review> findByProductId(@Param("productId") Long productId);

    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.hidden = false ORDER BY r.createdAt DESC")
    List<Review> findPublishedByProductId(@Param("productId") Long productId);
    
    @Query("SELECT r FROM Review r WHERE r.product.id IN :productIds AND r.hidden = false")
    List<Review> findByProductIdIn(@Param("productIds") List<Long> productIds);

    @Query("SELECT r FROM Review r WHERE r.combo.id = :comboId AND r.hidden = false ORDER BY r.createdAt DESC")
    List<Review> findPublishedByComboId(@Param("comboId") Long comboId);

    @Query("""
            SELECT r FROM Review r
            LEFT JOIN r.user u
            LEFT JOIN r.product p
            LEFT JOIN r.combo c
            WHERE (:keyword IS NULL OR LOWER(COALESCE(r.content, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:rating IS NULL OR (r.rate >= :rating AND r.rate < :rating + 1))
              AND (:hidden IS NULL OR r.hidden = :hidden)
              AND (:orderId IS NULL OR r.orderItem.order.id = :orderId)
            """)
    Page<Review> searchForAdmin(
            @Param("keyword") String keyword,
            @Param("rating") Integer rating,
            @Param("hidden") Boolean hidden,
            @Param("orderId") Long orderId,
            Pageable pageable);

    long countByHiddenFalse();

    long countByHiddenTrue();

    @Query("SELECT AVG(r.rate) FROM Review r WHERE r.hidden = false")
    Double findPublishedAverageRating();

    @Query("SELECT COUNT(r) FROM Review r WHERE r.hidden = false AND r.rate < 3")
    long countPublishedLowRatings();
}
