package codereview

import grails.test.mixin.Mock
import grails.test.mixin.TestFor
import spock.lang.Specification
import grails.converters.JSON

import grails.buildtestdata.mixin.Build

@TestFor(ChangesetController)
@Mock([Project, Commiter, Changeset, ProjectFile])
@Build([Changeset, ProjectFile])
class ChangesetControllerSpec extends Specification {

    def setup() {
        controller.scmAccessService = Mock(ScmAccessService)
    }

    def "getLastChangesets should return JSON"() {
        given:
        def changesets = (1 .. 3).collect { Changeset.build(identifier: it) }

        when:
        controller.getLastChangesets()

        then:
        response.getContentType().startsWith("application/json")
        response.json.size() == changesets.size()
    }

    def "initial checkout should delegate to service and display index afterwards"() {
        def numberOfProjects = 3
        given:
            (1 .. numberOfProjects).each { Project.build() }

        when:
            controller.initialCheckOut()

        then:
            numberOfProjects * controller.scmAccessService.checkoutProject(_)
            response.redirectedUrl == "/changeset/index"
    }

    def "should return few next changesets older than one with given revision id as JSON"() {
        given:
        def latestChangesetId = 3
        Changeset.build(identifier: latestChangesetId, date: new Date(3))
        Changeset.build(identifier: 2, date: new Date(2))
        Changeset.build(identifier: 1, date: new Date(1))

        when:
            controller.params.id = latestChangesetId
            controller.getNextFewChangesetsOlderThan()

        then:
            def responseChangesets = response.json
            responseChangesets[0].identifier == 2 as String
            responseChangesets[1].identifier == 1 as String
    }

    def "getChangeset should return one specific changeset "() {
        given:
        def  specificChangesetId = "hash24"
        Changeset.build(identifier: specificChangesetId).save()
        Changeset.build().save()
        Changeset.build().save()

        when:
        controller.params.id = specificChangesetId
        controller.getChangeset()

        then:
        response.json.size() == 1
        def  responseSpecificChangeset = response.json.first()
        responseSpecificChangeset.identifier == "hash24"
    }

    def "getFileNamesForChangeset should return file names from changeset "() {
        given:
        Changeset changeset = Changeset.build()
        ProjectFile projectFile = ProjectFile.build(changeset: changeset, name: "kickass!")

        when:
        controller.params.id = changeset.identifier
        controller.getFileNamesForChangeset()

        then:
        response.json.size() == 1
        response.json.first().name == projectFile.name
    }
}
