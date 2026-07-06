package com.siupo.restaurant.model;

import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode
public class ShippingAddress {
    private String address;
    private String ward;
    private String district;
    private String province;
    private String receiverName;
    private String receiverPhone;
    private Boolean isDefault;
}
