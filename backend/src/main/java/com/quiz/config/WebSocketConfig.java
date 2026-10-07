package com.quiz.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket & STOMP configuration for Live Arena (Vòng Chung kết sân khấu).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker to send messages to clients on /topic
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages that are bound for @MessageMapping methods
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(new org.springframework.messaging.support.ChannelInterceptor() {
            @Override
            public org.springframework.messaging.Message<?> preSend(org.springframework.messaging.Message<?> message, org.springframework.messaging.MessageChannel channel) {
                org.springframework.messaging.simp.stomp.StompHeaderAccessor accessor =
                        org.springframework.messaging.simp.stomp.StompHeaderAccessor.wrap(message);
                if (org.springframework.messaging.simp.stomp.StompCommand.SEND.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    // Prevent untrusted browser clients from directly publishing spoofed broadcast events to /topic or /queue
                    if (destination != null && (destination.startsWith("/topic") || destination.startsWith("/queue"))) {
                        throw new IllegalArgumentException("Khách hàng không được phép gửi trực tiếp đến kênh thông báo: " + destination);
                    }
                }
                return message;
            }
        });
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Pure WebSocket endpoint for modern clients (@stomp/stompjs)
        registry.addEndpoint("/ws-live")
                .setAllowedOriginPatterns("*");

        // Fallback endpoint with SockJS enabled for legacy browsers/networks
        registry.addEndpoint("/ws-live-sockjs")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
