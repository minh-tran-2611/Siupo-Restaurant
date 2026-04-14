package com.siupo.restaurant.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(Arrays.asList(
                new ConcurrentMapCache("analytics-summary"),
                new ConcurrentMapCache("analytics-revenue"),
                new ConcurrentMapCache("analytics-orders"),
                new ConcurrentMapCache("analytics-products"),
                new ConcurrentMapCache("analytics-customers"),
                new ConcurrentMapCache("analytics-bookings")
        ));
        return cacheManager;
    }
}
