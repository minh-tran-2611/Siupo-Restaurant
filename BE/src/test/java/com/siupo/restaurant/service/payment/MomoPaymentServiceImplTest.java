package com.siupo.restaurant.service.payment;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MomoPaymentServiceImplTest {

    @Test
    void extractsDatabaseOrderIdFromMomoOrderId() {
        assertEquals(100426L, MomoPaymentServiceImpl.extractOrderId("ORDER_100426_1783963143000"));
    }

    @Test
    void rejectsLegacyOrMalformedMomoOrderId() {
        assertThrows(IllegalArgumentException.class,
                () -> MomoPaymentServiceImpl.extractOrderId("ORDER_100426"));
        assertThrows(IllegalArgumentException.class,
                () -> MomoPaymentServiceImpl.extractOrderId("100426_1783963143000"));
        assertThrows(IllegalArgumentException.class,
                () -> MomoPaymentServiceImpl.extractOrderId(null));
    }
}
