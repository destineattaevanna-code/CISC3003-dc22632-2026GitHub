import React, { useEffect } from 'react';
import { Typography, Row, Col } from 'antd';

import "./Privacy.css"

const { Title, Paragraph } = Typography;

function PrivacyPage() {
    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

  return (
    <div className="container terms-container">
        <div style={{padding: "0 10%"}}>
                <Row>
                    <Title level={2}>Privacy Policy</Title>
                </Row>
                <Row>
                    <Paragraph>Last updated time: 2023-05-02</Paragraph>
                    <Paragraph style={{fontSize: "18px"}}>
                        This Privacy Policy is intended to explain how we collect, use, disclose and protect your personal
                        information when you use our website. Please read and understand this privacy policy carefully before
                        using our website. By continuing to use our website, you are consenting to the information collection,
                        use and disclosure practices described in this Privacy Policy. If you have any questions or concerns
                        about this Privacy Policy or your personal information, please contact us. We
                        will do our best to answer your questions and address your concerns.
                    </Paragraph>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>1. Information Collection</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            We may collect personal information provided by you, including but not limited to name, email address,
                            contact number, etc. In addition, we may also collect anonymous information about you automatically
                            through the use of technical tools such as cookies and web server log files. Once you complete registration,
                            you are deemed to have consented to our collection of the above data.
                        </Paragraph>
                    </Col>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>2. Information Use</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                The personal information we collect will be used for the following purposes:<br/>
                                1) To provide the service or information you have requested;<br/>
                                2) To process your order or request;<br/>
                                3) To send you updates and notifications about our products and services;<br/>
                                4) Improving our website and services;<br/>
                                5) Personalizing your user experience;<br/>
                                6) Fulfilling our legal obligations.
                            </Paragraph>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>3. Information Disclosure</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                We will disclose your personal information under the following circumstances:<br/>
                                1) With your express consent;<br/>
                                2) As required by law or as lawfully requested by government authorities;<br/>
                                3) To protect our legitimate interests or the safety of other users;<br/>
                                4) To share with our partners and third party service providers in order to provide the services you have requested.
                            </Paragraph>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>4. Information Protection</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                We take reasonable security measures to protect your personal information from unauthorized access, use, modification or disclosure.
                            </Paragraph>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>5. Cookies and Similar Technologies</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                Our website may use cookies and similar technologies to collect and store certain information.
                                You can manage cookie settings according to your preferences, but please note that disabling cookies
                                may affect your access to and experience with the features of the Site.
                            </Paragraph>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>6. Third Party Links</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                Our website may contain links to third party websites or services. We are not responsible for
                                the privacy practices or the content of these third party sites. Please read the privacy policies
                                of these sites before visiting them.
                            </Paragraph>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>7. Privacy Rights</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                In accordance with applicable law, you have the right to access, correct, delete and limit the
                                use of your personal information. To exercise these rights or to ask privacy-related questions,
                                please contact our Privacy Team.
                            </Paragraph>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={24}>
                            <Title style={{textDecoration: 'underline'}} level={4}>8. Changes to the Privacy Policy</Title>
                        </Col>
                        <Col span={24}>
                            <Paragraph style={{fontSize: "18px"}}>
                                We reserve the right to change this privacy policy at any time. For material changes, we will
                                notify you by posting an updated Privacy Policy on the Site.
                            </Paragraph>
                        </Col>
                    </Row>
                </Row>
            </div>
    </div>
  );
}

export default PrivacyPage;
