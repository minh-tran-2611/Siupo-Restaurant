package com.siupo.restaurant.service.order;

import com.siupo.restaurant.dto.request.CreateOrderRequest;
import com.siupo.restaurant.dto.response.CreateOrderResponse;
import com.siupo.restaurant.dto.response.OrderResponse;
import com.siupo.restaurant.enums.EOrderStatus;
import com.siupo.restaurant.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {

	CreateOrderResponse createOrder(CreateOrderRequest request, User user);

	CreateOrderResponse getOrderById(Long id, User user);

	List<OrderResponse> getOrdersByUser(User user);

	OrderResponse cancelOrderByCustomer(Long id, User user);

	// Admin methods
	Page<OrderResponse> getAllOrders(Pageable pageable, EOrderStatus status);

	OrderResponse getOrderDetailById(Long id);

	OrderResponse updateOrderStatus(Long id, EOrderStatus newStatus);

	boolean deleteOrder(Long id);

}
