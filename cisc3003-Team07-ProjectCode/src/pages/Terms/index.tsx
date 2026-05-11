import React, { useEffect } from 'react';
import { Typography, Row, Col } from 'antd';

import "./Terms.css"

const { Title, Paragraph } = Typography;

function TermsPage() {
    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

  return (
    <div className="container terms-container">
        <div style={{padding: "0 10%"}}>
          <Row>
                <Title level={2}>Terms of service</Title>
            </Row>
            <Row>
                <Paragraph>Last updated time: 2024-09-10</Paragraph>
            </Row>
            <Row>
                <Col span={24}>
                    <Title style={{textDecoration: 'underline'}} level={4}>1. Introduction</Title>
                </Col>
                <Col span={24}>
                    <Paragraph style={{fontSize: "18px"}}>
                        Thank you for using iSuperviz to read more papers and get more ideas!
                        These terms of service ("Terms") govern your access to and use of iSuperviz, including any content,
                        functionality, and services offered on or through the website (collectively, the "Service").
                        By accessing or using our services, you agree to be bound by these terms of service.  We encourage you to read these terms of service carefully before using our services.
                        When you use the services provided by the Website, you agree to all terms.
                    </Paragraph>
                    <Paragraph style={{fontSize: "18px"}}>
                        The Service uses artificial intelligence and generation models to provide interior design ideas
                        and suggestions to users. Users can interact with the web application interface to request
                        design suggestions, provide feedback, and receive editing result.
                    </Paragraph>
                </Col>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>2. User Accounts</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            To use the Service, you need to create an account. You agree to provide accurate, complete,
                            and current information when creating your account and to update your information as necessary.
                            You are responsible for maintaining the confidentiality of your account credentials and for all
                            activities that occur under your account. You agree to notify us immediately of any unauthorized
                            use of your account or any other breach of security.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>3. Intellectual Property</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            The AI-generated images produced by our web application are the property of our company and are
                            protected by intellectual property laws. We grant you a non-exclusive, non-transferable, royalty-free
                            license to use, reproduce, and modify the AI-generated images for personal or commercial use,
                            subject to the following conditions: <br/>
                            1) You acknowledge and agree that our company retains all rights, title, and interest in and to the AI-generated images, including all intellectual property rights.
                            <br/>
                            2) You are solely responsible for the use of the AI-generated images and agree to use them in compliance with all applicable laws, regulations, and industry standards.
                            <br/>
                            3) You agree not to use the AI-generated images in any way that may infringe on the intellectual property rights of others or violate any applicable laws or regulations.
                            <br/>
                            4) You agree to indemnify, defend, and hold us harmless from any claims, damages, losses, or expenses arising from your use of the AI-generated images.
                            <br/>
                            5) We are not responsible for any damages, including but not limited to direct, indirect, incidental, or consequential damages, resulting from your use of the AI-generated images.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>4. User Content</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            You are solely responsible for any content you submit or transmit to the Service, including but
                            not limited to image, messages, feedback, and design preferences.  You represent and warrant that
                            you have all necessary rights to submit or transmit such content and that it does not violate any
                            applicable laws or infringe any third-party rights. <br/>
                            By submitting or transmitting content to the Service, you grant us a non-exclusive, royalty-free,
                            perpetual, irrevocable, and fully sublicensable right to use, reproduce, modify, adapt, publish,
                            translate, create derivative works from, distribute, and display such content throughout the world
                            in any media.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>5. Disclaimers And Limitations Of Liability</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            The service is provided on an "as is" and "as available" basis without warranties of any kind,
                            either express or implied, including but not limited to warranties of merchantability, fitness for
                            a particular purpose, or non-infringement.  we make no warranties or representations about the accuracy
                            or completeness of the service, content, or user content. <br/>
                            In no event shall we or our licensors be liable for any indirect, special, incidental, consequential,
                            or punitive damages arising out of or in connection with the service, including but not limited to
                            loss of profits, loss of data, or interruption of business, whether based on warranty, contract,
                            tort, or any other legal theory, even if we have been advised of the possibility of such damages.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>6. Indemnification</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            You agree to indemnify, defend, and hold us and our officers, directors, employees, and agents
                            harmless from and against any claims, liabilities, damages, losses, and expenses, including
                            without limitation reasonable attorneys' fees and costs, arising out of or in any way connected
                            with your use of the Service or violation of these Terms.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>7. Modification Of Terms</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            We reserve the right to modify these Terms at any time by posting revised Terms on the Service.
                            Your continued use of the Service after the posting of revised Terms constitutes your acceptance of the revised Terms.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>8. Termination</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            We reserve the right to terminate or suspend your access to the Service, in whole or in part, at any time and for any reason, without notice or liability.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>9. Miscellaneous</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            These Terms constitute the entire agreement between you and us with respect to the Service and
                            supersede all prior or contemporaneous communications and proposals, whether oral or written,
                            between you and us.  If any provision of these Terms is found to be invalid or unenforceable,
                            the remaining provisions shall remain in full force and effect.  Our failure to enforce any right
                            or provision of these Terms shall not be deemed a waiver of such right or provision.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>10. User Responsibility</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            Users are responsible for complying with local laws and international conventions. Users must strictly
                            adhere to this statement when using the service and must not engage in any illegal or inappropriate
                            activities through the service. Users shall not publish, transmit, or share information that includes
                            any of the following: <br/>
                            1) Contrary to the fundamental principles established by the constitution. <br/>
                            2) Endangering national security, disclosing state secrets, subverting state power, or undermining
                            national unity. <br/>
                            3) Harming national honor and interests. <br/>
                            4) Inciting ethnic hatred, discrimination, or disrupting ethnic solidarity. <br/>
                            5) Disrupting national religious policies, promoting cults, or feudal superstitions.<br/>
                            6) Spreading rumors, disturbing social order, or undermining social stability.<br/>
                            7) Spreading obscene, pornographic, gambling, violent, murderous, terrorist, or criminal instigation content. <br/>
                            8) Insulting, defaming, or infringing upon the legitimate rights of others. <br/>
                            9) Containing false, fraudulent, harmful, coercive, privacy-invading, harassing, defamatory,
                            vulgar, obscene, or other morally offensive content.<br/>
                            10) Including content that is restricted or prohibited by the laws, regulations, rules, or norms
                            applicable under the jurisdiction of China or your country of residence. You should conduct
                            necessary reviews to ensure that your use of the service complies with applicable laws and
                            regulations, and you shall bear all liabilities arising therefrom. You acknowledge and agree that
                            we shall not be held liable for any violations of the above provisions in relation to the service
                            or your use of the service.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>11. Refund Policy</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            In the event that we are unable to provide the service due to reasons beyond our control, you may file a claim for compensation. Upon receiving your claim, we will review it, and if approved, we will process your claim within 7 working days.
                            The amount of compensation will be calculated based on the actual circumstances, and the compensation will be provided in the form of a credit not exceeding the maximum claim amount or a refund. In the case of a refund, it will be returned to your payment account upon completion of the refund process. Please note that the refund amount may vary depending on the payment channel and may be subject to certain fees.
                            Please note that if you have already used our service, we will not be able to provide a full refund. We will calculate the amount to be refunded based on the duration of the service you have already used.
                            If you violate our service terms or any other relevant policies, your refund request will not be processed.
                            If you have any questions or concerns, please feel free to contact us, and we will do our best to assist you in resolving the issue.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>12. Applicable Law and Jurisdiction</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            These terms are governed by the laws of the People's Republic of China. By using our website, you
                            agree that any disputes arising from your use of our website will be subject to the jurisdiction
                            of the courts of the People's Republic of China.
                        </Paragraph>
                    </Col>
                </Row>
                <Row>
                    <Col span={24}>
                        <Title style={{textDecoration: 'underline'}} level={4}>13. Contact Us</Title>
                    </Col>
                    <Col span={24}>
                        <Paragraph style={{fontSize: "18px"}}>
                            If you have any requests, comments or feedback for this website, please feel free to contact us by email or twitter.
                        </Paragraph>
                    </Col>
                </Row>
            </Row>
        </div>
    </div>
  );
}

export default TermsPage;
