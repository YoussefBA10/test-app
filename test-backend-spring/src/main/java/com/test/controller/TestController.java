package com.test.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class TestController {

    @GetMapping("/200")
    public ResponseEntity<Map<String, String>> success() {
        return ResponseEntity.ok(Map.of("message", "Success! Status 200"));
    }

    @GetMapping("/400")
    public ResponseEntity<Map<String, String>> clientError() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Client Error! Status 400"));
    }

    @GetMapping("/500")
    public ResponseEntity<Map<String, String>> serverError() {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Server Error! Status 500"));
    }
}
