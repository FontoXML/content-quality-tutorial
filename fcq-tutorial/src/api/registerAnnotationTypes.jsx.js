import React from 'react';

import { Flex, Inlay, Label } from 'fds/components';
import FxOperationButton from 'fontoxml-fx/FxOperationButton.jsx';

import t from 'fontoxml-localization/t';

import ContentQualityDefaultSidebarListCardContent from 'fontoxml-content-quality/ContentQualityDefaultSidebarListCardContent.jsx';
import ContentQualityTextWithAnnotationStyle from 'fontoxml-content-quality/ContentQualityTextWithAnnotationStyle.jsx';
import contentQualityManager from 'fontoxml-content-quality/contentQualityManager';

const getContextMenuOperations = annotation => {
	if (!annotation || !annotation.metadata || !annotation.metadata.replacement) {
		return [];
	}

	const replacement = annotation.metadata.replacement;
	return [
		{
			label: replacement,
			operationName: 'content-quality-replace-text',
			operationData: {
				annotationId: annotation.id,
				text: replacement
			}
		}
	];
};

const renderSidebarDetails = ({ annotation, next }) => {
	const operationData = {
		annotationId: annotation.id,
		text: annotation.metadata.replacement
	};

	return (
		<Flex flexDirection="column" justifyContent="flex-start" spaceSize="m">
			<Inlay isScrollContainer>
				<Label isBold>{t('Unit of measure does not match locale.')}</Label>
				<ContentQualityTextWithAnnotationStyle
					text={t(
						'Replace %style_start%{ANNOTATION_TEXT}%style_end% with {REPLACEMENT}.',
						{
							ANNOTATION_TEXT: annotation.text,
							REPLACEMENT: annotation.metadata.replacement
						}
					)}
					annotationType={annotation.type}
				/>
			</Inlay>

			<Flex flex="0 0 auto" justifyContent="flex-end">
				<FxOperationButton
					label={t('Replace')}
					type="primary"
					onClick={next}
					operationName="content-quality-replace-text"
					operationData={operationData}
				/>
			</Flex>
		</Flex>
	);
};
const renderSidebarListCardContent = ({ annotation }) => (
	<ContentQualityDefaultSidebarListCardContent
		annotation={annotation}
		title={t('Unit of measure does not match locale')}
	/>
);

export default function registerAnnotationTypes () {
	// Annotation: {urn:fontoxml:fcq:annotations:tutorial:1.0.0}unit-of-measure-convert
	contentQualityManager.registerAnnotationType(
		'urn:fontoxml:fcq:annotations:tutorial:1.0.0',
		'unit-of-measure-convert',
		{
			getContextMenuGroup: annotation => ({
				heading: t('Unit of measure'),
				operations: getContextMenuOperations(annotation)
			}),
			renderSidebarDetails,
			renderSidebarListCardContent,
			icon: 'globe',
			squiggleVariation: 'wavy-underline'
		}
	);
}
