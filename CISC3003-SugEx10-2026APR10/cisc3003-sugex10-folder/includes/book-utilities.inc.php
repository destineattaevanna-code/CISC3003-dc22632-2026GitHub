<?php

function readCustomers($filename) {
    $customers = array();

    if (!file_exists($filename) || !is_readable($filename)) {
        return $customers;
    }

    $handle = fopen($filename, 'r');
    if (!$handle) {
        return $customers;
    }

    while (($line = fgets($handle)) !== false) {
        $line = trim($line);

        if ($line === '') {
            continue;
        }

        $parts = explode(';', $line);

        // customers.txt: id;first;last;email;university;address;city;state;country;zip;phone;sales
        if (count($parts) < 12) {
            continue;
        }

        $id = trim($parts[0]);

        // 如果有标题行，就跳过
        if (strtolower($id) === 'id' || strtolower($id) === 'customerid') {
            continue;
        }

        $customers[$id] = array(
            'id'         => $id,
            'firstName'  => trim($parts[1]),
            'lastName'   => trim($parts[2]),
            'email'      => trim($parts[3]),
            'university' => trim($parts[4]),
            'address'    => trim($parts[5]),
            'city'       => trim($parts[6]),
            'state'      => trim($parts[7]),
            'country'    => trim($parts[8]),
            'zip'        => trim($parts[9]),
            'phone'      => trim($parts[10]),
            'sales'      => trim($parts[11])
        );
    }

    fclose($handle);
    return $customers;
}

function readOrders($customer, $filename) {
    $orders = array();

    if (!file_exists($filename) || !is_readable($filename)) {
        return $orders;
    }

    $handle = fopen($filename, 'r');
    if (!$handle) {
        return $orders;
    }

    while (($line = fgets($handle)) !== false) {
        $line = trim($line);

        if ($line === '') {
            continue;
        }

        $parts = explode(';', $line);

        // orders.txt: orderid;customerid;isbn;title;category
        if (count($parts) < 5) {
            continue;
        }

        $orderId    = trim($parts[0]);
        $customerId = trim($parts[1]);

        // 如果有标题行，就跳过
        if (strtolower($orderId) === 'id' || strtolower($orderId) === 'orderid') {
            continue;
        }

        if ($customerId == $customer) {
            $orders[] = array(
                'orderId'    => $orderId,
                'customerId' => $customerId,
                'isbn'       => trim($parts[2]),
                'title'      => trim($parts[3]),
                'category'   => trim($parts[4])
            );
        }
    }

    fclose($handle);
    return $orders;
}

function findBookCover($isbn) {
    $extensions = array('jpg', 'jpeg', 'png', 'gif', 'webp');

    foreach ($extensions as $ext) {
        $path = 'images/tinysquare/' . $isbn . '.' . $ext;
        if (file_exists($path)) {
            return $path;
        }
    }

    return 'images/favicon.png';
}
?>