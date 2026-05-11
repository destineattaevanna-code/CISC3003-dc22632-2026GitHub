<?php
include 'includes/book-utilities.inc.php';

$customers = readCustomers('data/customers.txt');
$self = basename($_SERVER['PHP_SELF']);

$selectedId = isset($_GET['id']) ? trim($_GET['id']) : '';
$selectedCustomer = null;
$orders = array();

if ($selectedId !== '' && isset($customers[$selectedId])) {
    $selectedCustomer = $customers[$selectedId];
    $orders = readOrders($selectedId, 'data/orders.txt');
}

function e($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <title>dc226328 MA IAT TIM</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="http://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" type="text/css">

    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <link rel="stylesheet" href="https://code.getmdl.io/1.1.3/material.blue_grey-orange.min.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/demo-styles.css">

    <script src="https://code.jquery.com/jquery-1.7.2.min.js"></script>
    <script src="https://code.getmdl.io/1.1.3/material.min.js"></script>
    <script src="js/jquery.sparkline.2.1.2.js"></script>

    <style>
        .customer-table,
        .order-table {
            width: 100%;
        }

        .customer-table td,
        .customer-table th,
        .order-table td,
        .order-table th {
            white-space: normal;
        }

        .book-cover {
            width: 40px;
            height: 60px;
            object-fit: cover;
            border: 1px solid #ccc;
            background: #fff;
        }

        .details-line {
            margin: 6px 0;
        }

        .message-box {
            padding: 10px 0;
            color: #444;
        }

        .no-orders {
            color: #c62828;
            font-weight: bold;
            margin-top: 10px;
        }

        .page-footer {
            margin: 20px;
            padding: 14px 16px;
            text-align: center;
            background: #ffffff;
            border: 1px solid #ddd;
            font-size: 14px;
        }

        .sparkline {
            display: inline-block;
            min-width: 100px;
        }

        a.customer-link {
            text-decoration: none;
            font-weight: bold;
        }

        a.customer-link:hover {
            text-decoration: underline;
        }
    </style>
</head>

<body>

<div class="mdl-layout mdl-js-layout mdl-layout--fixed-drawer mdl-layout--fixed-header">

    <?php include 'includes/header.inc.php'; ?>
    <?php include 'includes/left-nav.inc.php'; ?>

    <main class="mdl-layout__content mdl-color--grey-50">
        <section class="page-content">

            <div class="mdl-grid">

                <!-- Customers -->
                <div class="mdl-cell mdl-cell--7-col card-lesson mdl-card mdl-shadow--2dp">
                    <div class="mdl-card__title mdl-color--orange">
                        <h2 class="mdl-card__title-text">Customers</h2>
                    </div>
                    <div class="mdl-card__supporting-text">
                        <table class="mdl-data-table mdl-shadow--2dp customer-table">
                            <thead>
                                <tr>
                                    <th class="mdl-data-table__cell--non-numeric">Name</th>
                                    <th class="mdl-data-table__cell--non-numeric">University</th>
                                    <th class="mdl-data-table__cell--non-numeric">City</th>
                                    <th>Sales</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($customers as $customer): ?>
                                    <tr>
                                        <td class="mdl-data-table__cell--non-numeric">
                                            <a class="customer-link" href="<?php echo e($self); ?>?id=<?php echo urlencode($customer['id']); ?>">
                                                <?php echo e($customer['firstName'] . ' ' . $customer['lastName']); ?>
                                            </a>
                                        </td>
                                        <td class="mdl-data-table__cell--non-numeric">
                                            <?php echo e($customer['university']); ?>
                                        </td>
                                        <td class="mdl-data-table__cell--non-numeric">
                                            <?php echo e($customer['city']); ?>
                                        </td>
                                        <td>
                                            <span class="sparkline"><?php echo e($customer['sales']); ?></span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
                <!-- /Customers -->

                <div class="mdl-grid mdl-cell--5-col">

                    <!-- Customer Details -->
                    <div class="mdl-cell mdl-cell--12-col card-lesson mdl-card mdl-shadow--2dp">
                        <div class="mdl-card__title mdl-color--deep-purple mdl-color-text--white">
                            <h2 class="mdl-card__title-text">Customer Details</h2>
                        </div>
                        <div class="mdl-card__supporting-text">
                            <?php if ($selectedCustomer): ?>
                                <h4><?php echo e($selectedCustomer['firstName'] . ' ' . $selectedCustomer['lastName']); ?></h4>

                                <div class="details-line"><strong>Customer ID:</strong> <?php echo e($selectedCustomer['id']); ?></div>
                                <div class="details-line"><strong>Email:</strong> <?php echo e($selectedCustomer['email']); ?></div>
                                <div class="details-line"><strong>University:</strong> <?php echo e($selectedCustomer['university']); ?></div>
                                <div class="details-line"><strong>Address:</strong> <?php echo e($selectedCustomer['address']); ?></div>
                                <div class="details-line"><strong>City:</strong> <?php echo e($selectedCustomer['city']); ?></div>
                                <div class="details-line"><strong>State:</strong> <?php echo e($selectedCustomer['state']); ?></div>
                                <div class="details-line"><strong>Country:</strong> <?php echo e($selectedCustomer['country']); ?></div>
                                <div class="details-line"><strong>Zip / Postal:</strong> <?php echo e($selectedCustomer['zip']); ?></div>
                                <div class="details-line"><strong>Phone:</strong> <?php echo e($selectedCustomer['phone']); ?></div>
                            <?php else: ?>
                                <div class="message-box">Please click a customer name to view customer details.</div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <!-- /Customer Details -->

                    <!-- Order Details -->
                    <div class="mdl-cell mdl-cell--12-col card-lesson mdl-card mdl-shadow--2dp">
                        <div class="mdl-card__title mdl-color--deep-purple mdl-color-text--white">
                            <h2 class="mdl-card__title-text">Order Details</h2>
                        </div>
                        <div class="mdl-card__supporting-text">

                            <?php if ($selectedCustomer): ?>
                                <h4>
                                    Orders for <?php echo e($selectedCustomer['firstName'] . ' ' . $selectedCustomer['lastName']); ?>
                                </h4>

                                <?php if (count($orders) > 0): ?>
                                    <table class="mdl-data-table mdl-shadow--2dp order-table">
                                        <thead>
                                            <tr>
                                                <th class="mdl-data-table__cell--non-numeric">Cover</th>
                                                <th class="mdl-data-table__cell--non-numeric">ISBN</th>
                                                <th class="mdl-data-table__cell--non-numeric">Title</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($orders as $order): ?>
                                                <tr>
                                                    <td class="mdl-data-table__cell--non-numeric">
                                                        <img
                                                            class="book-cover"
                                                            src="<?php echo e(findBookCover($order['isbn'])); ?>"
                                                            alt="<?php echo e($order['title']); ?>">
                                                    </td>
                                                    <td class="mdl-data-table__cell--non-numeric">
                                                        <?php echo e($order['isbn']); ?>
                                                    </td>
                                                    <td class="mdl-data-table__cell--non-numeric">
                                                        <?php echo e($order['title']); ?>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                <?php else: ?>
                                    <div class="no-orders">No order information for this customer.</div>
                                <?php endif; ?>

                            <?php else: ?>
                                <div class="message-box">Please click a customer name to view order details.</div>
                            <?php endif; ?>

                        </div>
                    </div>
                    <!-- /Order Details -->

                </div>

            </div>
            <!-- /mdl-grid -->

            <footer class="page-footer">
                CISC3003 Web Programming: dc226328 MA IAT TIM 2026
            </footer>

        </section>
    </main>
</div>
<!-- /mdl-layout -->

<script>
    $(function () {
        $('.sparkline').sparkline('html', {
            type: 'bar',
            barColor: '#ff9800',
            height: '26px',
            barWidth: 5,
            barSpacing: 2
        });
    });
</script>

</body>
</html>
